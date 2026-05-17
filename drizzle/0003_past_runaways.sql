CREATE TABLE `experiment_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`protocolId` int,
	`protocolTitle` varchar(255) NOT NULL,
	`performedBy` varchar(255),
	`sampleCount` int,
	`outcome` enum('success','partial','failed') NOT NULL DEFAULT 'success',
	`notes` text,
	`runAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `experiment_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `protocols` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`category` varchar(128),
	`description` text,
	`steps` longtext,
	`reagents` longtext,
	`citations` longtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `protocols_id` PRIMARY KEY(`id`)
);
