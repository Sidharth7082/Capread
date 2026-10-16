#include "HybridEpub.hpp"
#include "export/EpubExporter.hpp"
#include "import/EpubParser.hpp"

namespace margelo::nitro::nitroepub {

std::shared_ptr<Promise<EpubNovel>> HybridEpub::parseNovelAndChapters(
    const std::string& epubDirPath) {
  return Promise<EpubNovel>::async([epubDirPath]() {
    EpubMetadata metadata = parseEpub(epubDirPath);

    EpubNovel result;
    result.name = metadata.name;
    result.cover = metadata.cover.empty()
      ? std::nullopt
      : std::optional(metadata.cover);
    result.summary = metadata.summary.empty()
      ? std::nullopt
      : std::optional(metadata.summary);
    result.author = metadata.author.empty()
      ? std::nullopt
      : std::optional(metadata.author);
    result.artist = metadata.artist.empty()
      ? std::nullopt
      : std::optional(metadata.artist);

    for (const auto& chapter : metadata.chapters) {
      result.chapters.emplace_back(chapter.name, chapter.path);
    }
    result.cssPaths = metadata.cssPaths;
    result.imagePaths = metadata.imagePaths;

    return result;
  });
}

std::shared_ptr<Promise<EpubExportResult>> HybridEpub::exportEpub(
    const EpubExportMetadata& metadata,
    const std::vector<EpubExportChapter>& chapters,
    const std::string& outputPath,
    const std::function<
        std::shared_ptr<Promise<std::shared_ptr<Promise<void>>>>(
            double, double, const std::string&)>&
        onProgress) {
  return Promise<EpubExportResult>::async(
      [metadata, chapters, outputPath, onProgress]() {
        EpubArchiveMetadata archiveMetadata{
            metadata.title,
            metadata.language,
            metadata.coverPath,
            metadata.description,
            metadata.author,
            metadata.bookId,
            metadata.stylesheet,
            metadata.javascript,
        };
        std::vector<EpubArchiveChapter> archiveChapters;
        archiveChapters.reserve(chapters.size());
        for (const EpubExportChapter& chapter : chapters) {
          archiveChapters.push_back(EpubArchiveChapter{
              chapter.title,
              chapter.htmlPath,
              chapter.novelId,
              chapter.chapterId,
          });
        }
        const EpubArchiveResult result =
            exportEpubArchive(
                archiveMetadata,
                archiveChapters,
                outputPath,
                [onProgress](std::size_t completedChapters,
                             std::size_t totalChapters,
                             const std::string& chapterTitle) {
                  const std::shared_ptr<Promise<void>> progressPromise =
                      onProgress(static_cast<double>(completedChapters),
                                 static_cast<double>(totalChapters),
                                 chapterTitle)
                          ->await()
                          .get();
                  progressPromise->await().get();
                });
        return EpubExportResult(
            result.outputPath, static_cast<double>(result.chapterCount));
      });
}

} // namespace margelo::nitro::nitroepub
