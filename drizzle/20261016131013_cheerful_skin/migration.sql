CREATE TABLE `ChapterChatMessage` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`chapterId` integer NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`createdAt` text
);
--> statement-breakpoint
CREATE TABLE `ChapterSummary` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`chapterId` integer NOT NULL,
	`summary` text NOT NULL,
	`provider` text,
	`model` text,
	`updatedAt` text
);
--> statement-breakpoint
CREATE INDEX `chapter_chat_message_chapter_idx` ON `ChapterChatMessage` (`chapterId`);--> statement-breakpoint
CREATE UNIQUE INDEX `chapter_summary_chapter_unique` ON `ChapterSummary` (`chapterId`);