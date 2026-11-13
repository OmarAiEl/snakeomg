CREATE TABLE `arena_members` (
	`user_id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`name` text NOT NULL,
	`angle` integer NOT NULL,
	`boost` integer NOT NULL,
	`seen_at` integer NOT NULL,
	`respawn` integer NOT NULL,
	`appearance` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `arena_room` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`updated_at` integer NOT NULL,
	`revision` integer NOT NULL,
	`lease` text NOT NULL,
	`lease_until` integer NOT NULL
);
