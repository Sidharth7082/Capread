#include <string>
#include "../pugixml.hpp"
#include <iostream>
#include <stdexcept>
#include <unordered_map>
#include <unordered_set>
#include <vector>
#include "EpubChapterNormalizer.hpp"
#include "EpubParser.hpp"
#include <sstream>

namespace {

std::string join(const std::string &folder_path, const std::string &child_path)
{
    std::string full_path = folder_path;
    if (!full_path.empty() && full_path.back() != '/')
    {
        full_path += '/';
    }

    std::stringstream ss(child_path);
    std::string segment;
    while (std::getline(ss, segment, '/'))
    {
        if (segment == "..")
        {
            // Go up one level
            if (!full_path.empty())
            {
                size_t lastSlash = full_path.rfind('/', full_path.length() - 2);
                if (lastSlash != std::string::npos)
                {
                    full_path.resize(lastSlash + 1);
                }
                else
                {
                    full_path = "";
                }
            }
        }
        else if (segment != "." && !segment.empty())
        {
            full_path += segment + '/';
        }
    }

    if (full_path.length() > 1 && full_path.back() == '/')
    {
        full_path.pop_back();
    }

    return full_path;
}

std::string getParentPath(const std::string &path)
{
    if (path.empty())
        return "";

    size_t pos = path.find_last_of("/\\");
    if (pos == std::string::npos)
    {
        return "";
    }

    return path.substr(0, pos);
}

std::string getLocalName(const std::string &qualified_name)
{
    size_t separator = qualified_name.find(':');
    return separator == std::string::npos
        ? qualified_name
        : qualified_name.substr(separator + 1);
}

bool hasLocalName(const pugi::xml_node &node, const char *local_name)
{
    return getLocalName(node.name()) == local_name;
}

pugi::xml_node childByLocalName(const pugi::xml_node &parent, const char *local_name)
{
    for (pugi::xml_node child : parent.children())
    {
        if (hasLocalName(child, local_name))
        {
            return child;
        }
    }
    return {};
}

void collectDescendantsByLocalName(const pugi::xml_node &parent,
                                   const char *local_name,
                                   std::vector<pugi::xml_node> &result)
{
    for (pugi::xml_node child : parent.children())
    {
        if (hasLocalName(child, local_name))
        {
            result.push_back(child);
        }
        collectDescendantsByLocalName(child, local_name, result);
    }
}

std::string findImageReference(const pugi::xml_node &node)
{
    std::string node_name = getLocalName(node.name());
    if (node_name == "img" || node_name == "image")
    {
        for (const char *attribute_name : {"src", "href", "xlink:href"})
        {
            std::string reference = node.attribute(attribute_name).as_string();
            if (!reference.empty())
            {
                size_t fragment = reference.find('#');
                return fragment == std::string::npos
                    ? reference
                    : reference.substr(0, fragment);
            }
        }
    }

    for (pugi::xml_node child : node.children())
    {
        std::string reference = findImageReference(child);
        if (!reference.empty())
        {
            return reference;
        }
    }

    return "";
}

std::string findCoverImagePath(
    const std::string &cover_document_path,
    const std::unordered_set<std::string> &image_paths)
{
    pugi::xml_document cover_document;
    if (!cover_document.load_file(cover_document_path.c_str()))
    {
        return "";
    }

    std::string image_reference = findImageReference(cover_document);
    if (image_reference.empty())
    {
        return "";
    }

    std::string image_path = join(getParentPath(cover_document_path), image_reference);
    return image_paths.count(image_path) ? image_path : "";
}

bool hasProperty(const std::string &properties, const std::string &property)
{
    std::stringstream property_stream(properties);
    std::string value;
    while (property_stream >> value)
    {
        if (value == property)
        {
            return true;
        }
    }
    return false;
}

std::string find_toc_href(const pugi::xml_document &opf_doc)
{
    pugi::xml_node package = childByLocalName(opf_doc, "package");
    pugi::xml_node manifest = childByLocalName(package, "manifest");
    for (pugi::xml_node item : manifest.children())
    {
        if (!hasLocalName(item, "item"))
            continue;

        std::string media_type = item.attribute("media-type").value();
        std::string id = item.attribute("id").value();
        if (media_type == "application/x-dtbncx+xml" || id == "ncx" || id == "nav")
        {
            return item.attribute("href").value();
        }
    }
    return "";
}

void parse_navele_recursive(const pugi::xml_node &parent,
                            std::unordered_map<std::string, std::string> &href_to_label, std::string &nav_folder)
{
    for (pugi::xml_node li : parent.children())
    {
        if (!hasLocalName(li, "li"))
            continue;

        pugi::xml_node a = childByLocalName(li, "a");
        if (a)
        {
            std::string href = a.attribute("href").as_string();
            std::string label = a.text().as_string();

            size_t sharp = href.find('#');
            if (sharp != std::string::npos)
                href = href.substr(0, sharp);

            if (!href.empty() && !label.empty())
                href_to_label[join(nav_folder, href)] = label;
        }

        if (pugi::xml_node sublist = childByLocalName(li, "ol"))
        {
            parse_navele_recursive(sublist, href_to_label, nav_folder);
        }
    }
}

void parse_nav_xhtml(const std::string &nav_path,
                     std::unordered_map<std::string, std::string> &path_to_label)
{
    std::string nav_folder = getParentPath(nav_path);
    pugi::xml_document nav_doc;
    if (!nav_doc.load_file(nav_path.c_str()))
        return;

    std::vector<pugi::xml_node> nav_nodes;
    collectDescendantsByLocalName(nav_doc, "nav", nav_nodes);
    for (pugi::xml_node node : nav_nodes)
    {
        pugi::xml_node ol = childByLocalName(node, "ol");
        if (ol)
        {
            parse_navele_recursive(ol, path_to_label, nav_folder);
        }
    }
}

void parse_navpoint_recursive(const pugi::xml_node &navPoint,
                              std::unordered_map<std::string, std::string> &result, std::string &ncx_folder)
{
    for (pugi::xml_node point : navPoint.children())
    {
        if (!hasLocalName(point, "navPoint"))
            continue;

        std::string label;
        pugi::xml_node labelNode = childByLocalName(
            childByLocalName(point, "navLabel"), "text");
        if (labelNode)
            label = labelNode.text().as_string();

        std::string src;
        pugi::xml_node contentNode = childByLocalName(point, "content");
        if (contentNode)
            src = contentNode.attribute("src").as_string();

        if (!label.empty() && !src.empty())
        {
            size_t sharp = src.find('#');
            if (sharp != std::string::npos)
                src = src.substr(0, sharp);
            result[join(ncx_folder, src)] = label;
        }

        parse_navpoint_recursive(point, result, ncx_folder);
    }
}

void parse_toc_ncx(const std::string &ncx_path, std::unordered_map<std::string, std::string> &href_to_label)
{
    std::string ncx_folder = getParentPath(ncx_path);
    pugi::xml_document doc;
    if (!doc.load_file(ncx_path.c_str()))
        return;

    pugi::xml_node navMap = childByLocalName(
        childByLocalName(doc, "ncx"), "navMap");
    if (!navMap)
        return;

    parse_navpoint_recursive(navMap, href_to_label, ncx_folder);
}

void parse_opf_from_folder(const std::string &base_dir,
                           const std::string &opf_rel_path,
                           EpubMetadata &meta_out)
{
    std::string opf_path = join(base_dir, opf_rel_path);
    std::string opf_dir = getParentPath(opf_path);
    pugi::xml_document opf_doc;
    if (!opf_doc.load_file(opf_path.c_str()))
        throw std::runtime_error("Failed to load EPUB package document");

    pugi::xml_node package = childByLocalName(opf_doc, "package");
    if (!package)
        throw std::runtime_error("EPUB package document is missing package");

    std::unordered_map<std::string, std::string> path_to_label;
    std::string toc_href = find_toc_href(opf_doc);
    if (!toc_href.empty() && toc_href.find("ncx") != std::string::npos)
    {
        std::string ncx_path = join(opf_dir, toc_href);
        parse_toc_ncx(ncx_path, path_to_label);
    }
    else if (!toc_href.empty())
    {
        std::string nav_path = join(opf_dir, toc_href);
        parse_nav_xhtml(nav_path, path_to_label);
    }

    pugi::xml_node metadata = childByLocalName(package, "metadata");
    meta_out.name = childByLocalName(metadata, "title").text().as_string();
    meta_out.author = childByLocalName(metadata, "creator").text().as_string();
    meta_out.artist = childByLocalName(metadata, "contributor").text().as_string();
    meta_out.summary = childByLocalName(metadata, "description").text().as_string();

    std::unordered_map<std::string, std::string> id_to_href;
    std::unordered_map<std::string, std::string> id_to_media_type;
    std::unordered_set<std::string> image_paths;
    std::string property_cover_id;

    std::string cover_id;
    for (pugi::xml_node meta : metadata.children())
    {
        if (!hasLocalName(meta, "meta"))
            continue;

        if (std::string(meta.attribute("name").value()) == "cover")
        {
            cover_id = meta.attribute("content").value();
            break;
        }
    }

    pugi::xml_node manifest = childByLocalName(package, "manifest");
    if (!manifest)
        throw std::runtime_error("EPUB package document is missing manifest");

    for (pugi::xml_node item : manifest.children())
    {
        if (!hasLocalName(item, "item"))
            continue;

        std::string id = item.attribute("id").value();
        std::string href = item.attribute("href").value();
        std::string media_type = item.attribute("media-type").value();
        std::string properties = item.attribute("properties").value();

        id_to_href[id] = href;
        id_to_media_type[id] = media_type;
        if (media_type == "text/css")
        {
            meta_out.cssPaths.push_back(join(opf_dir, href));
        }
        else if (media_type.rfind("image/", 0) == 0)
        {
            std::string image_path = join(opf_dir, href);
            meta_out.imagePaths.push_back(image_path);
            image_paths.insert(image_path);
            if (property_cover_id.empty() && hasProperty(properties, "cover-image"))
            {
                property_cover_id = id;
            }
        }
    }

    if (!cover_id.empty() && id_to_href.count(cover_id) &&
        id_to_media_type[cover_id].rfind("image/", 0) == 0)
    {
        meta_out.cover = join(opf_dir, id_to_href[cover_id]);
    }
    else if (!property_cover_id.empty())
    {
        meta_out.cover = join(opf_dir, id_to_href[property_cover_id]);
    }
    else if (id_to_href.count("cover-image") &&
             id_to_media_type["cover-image"].rfind("image/", 0) == 0)
    {
        meta_out.cover = join(opf_dir, id_to_href["cover-image"]);
    }
    else if (!cover_id.empty() && id_to_href.count(cover_id))
    {
        std::string cover_document_path = join(opf_dir, id_to_href[cover_id]);
        meta_out.cover = findCoverImagePath(cover_document_path, image_paths);
    }

    pugi::xml_node spine = childByLocalName(package, "spine");
    if (!spine)
        throw std::runtime_error("EPUB package document is missing spine");

    std::string prev_name = "";
    int part = 2;
    for (pugi::xml_node itemref : spine.children())
    {
        if (!hasLocalName(itemref, "itemref"))
            continue;

        std::string idref = itemref.attribute("idref").value();
        if (id_to_href.count(idref))
        {
            std::string chapter_href = id_to_href[idref];
            Chapter chapter;
            chapter.path = join(opf_dir, chapter_href);
            normalizeEpubChapter(chapter.path);

            if (path_to_label.count(chapter.path))
            {
                chapter.name = path_to_label[chapter.path];
            }
            if (chapter.name.empty())
            {
                if (prev_name.empty())
                {
                    size_t start_pos = chapter_href.find_last_of("/");
                    if (start_pos == std::string::npos)
                    {
                        start_pos = 0;
                    }
                    else
                    {
                        start_pos++;
                    }
                    chapter.name = chapter_href.substr(start_pos, chapter_href.find_last_of(".") - start_pos);
                }
                else
                {
                    chapter.name = prev_name + " (" + std::to_string(part) + ")";
                    part += 1;
                }
            }
            else
            {
                prev_name = chapter.name;
                part = 2;
            }

            meta_out.chapters.push_back(chapter);
        }
    }

    if (meta_out.chapters.empty())
        throw std::runtime_error("EPUB spine contains no readable chapters");
}

} // namespace

EpubMetadata parseEpub(const std::string epub_path)
{
    std::string container_path = join(epub_path, "META-INF/container.xml");

    pugi::xml_document container_doc;
    if (!container_doc.load_file(container_path.c_str()))
        throw std::runtime_error("Failed to load container.xml");

    pugi::xml_node container = childByLocalName(container_doc, "container");
    pugi::xml_node rootfiles = childByLocalName(container, "rootfiles");
    pugi::xml_node rootfile = childByLocalName(rootfiles, "rootfile");
    std::string opf_path = rootfile.attribute("full-path").value();
    if (opf_path.empty())
        throw std::runtime_error("container.xml is missing a package path");

    EpubMetadata metadata;
    parse_opf_from_folder(epub_path, opf_path, metadata);

    return metadata;
}
