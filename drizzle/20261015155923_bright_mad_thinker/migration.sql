CREATE TABLE `NovelRecap` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`novelId` integer NOT NULL,
	`summary` text NOT NULL,
	`upToChapterId` integer,
	`chaptersCovered` integer DEFAULT 0 NOT NULL,
	`provider` text,
	`model` text,
	`updatedAt` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `novel_recap_novel_unique` ON `NovelRecap` (`novelId`);