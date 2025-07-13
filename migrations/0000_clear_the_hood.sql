CREATE TABLE `ai_knowledge_graph` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `ai_memories` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`content` text NOT NULL,
	`category` text NOT NULL,
	`metadata` text,
	`embedding` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `annotations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`document_id` integer NOT NULL,
	`chapter` integer NOT NULL,
	`paragraph` integer,
	`selected_text` text NOT NULL,
	`note` text NOT NULL,
	`type` text DEFAULT 'user' NOT NULL,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bookmarks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`document_id` integer NOT NULL,
	`chapter` integer NOT NULL,
	`paragraph` integer,
	`title` text,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`title` text NOT NULL,
	`filename` text NOT NULL,
	`file_type` text NOT NULL,
	`total_chapters` integer NOT NULL,
	`content` text NOT NULL,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `embedding_cache` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`text_hash` text NOT NULL,
	`model` text NOT NULL,
	`embedding` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`last_accessed_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`access_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `embedding_cache_text_hash_unique` ON `embedding_cache` (`text_hash`);--> statement-breakpoint
CREATE INDEX `text_hash_idx` ON `embedding_cache` (`text_hash`);--> statement-breakpoint
CREATE TABLE `knowledge_graph_concepts` (
	`id` integer PRIMARY KEY NOT NULL,
	`graph_id` integer,
	`name` text NOT NULL,
	`summary` text,
	`source_document_id` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`graph_id`) REFERENCES `ai_knowledge_graph`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `knowledge_graph_edges` (
	`id` integer PRIMARY KEY NOT NULL,
	`graph_id` integer,
	`source_concept_id` integer,
	`target_concept_id` integer,
	`label` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`graph_id`) REFERENCES `ai_knowledge_graph`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_concept_id`) REFERENCES `knowledge_graph_concepts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_concept_id`) REFERENCES `knowledge_graph_concepts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `learned_definitions` (
	`id` integer PRIMARY KEY NOT NULL,
	`term` text NOT NULL,
	`definition` text NOT NULL,
	`source_document_id` integer,
	`context_snippet` text,
	`user_feedback` text,
	`confidence_score` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	`related_terms` text,
	`embedding` text,
	`tags` text,
	`access_count` integer DEFAULT 0,
	`last_accessed_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `learned_definitions_term_unique` ON `learned_definitions` (`term`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`is_read` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `power_summaries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`document_id` integer NOT NULL,
	`chapter` integer NOT NULL,
	`chapter_title` text NOT NULL,
	`power_summary` text NOT NULL,
	`key_insights` text NOT NULL,
	`main_themes` text NOT NULL,
	`actionable_points` text NOT NULL,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`updated_at` text DEFAULT 'datetime(''now'')' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `query_result_cache` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`query_hash` text NOT NULL,
	`query_text` text NOT NULL,
	`embedding` text,
	`model` text NOT NULL,
	`result` text NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`last_accessed_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`access_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `query_result_cache_query_hash_unique` ON `query_result_cache` (`query_hash`);--> statement-breakpoint
CREATE INDEX `query_hash_idx` ON `query_result_cache` (`query_hash`);--> statement-breakpoint
CREATE TABLE `reading_progress` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`document_id` integer NOT NULL,
	`chapter` integer NOT NULL,
	`completed` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);