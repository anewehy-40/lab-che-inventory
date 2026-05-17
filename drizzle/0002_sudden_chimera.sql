CREATE TABLE `saved_protocols` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`question` text NOT NULL,
	`response` longtext NOT NULL,
	`tags` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `saved_protocols_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `chemicals` ADD `scientificUses` text;--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);