CREATE TABLE `game_saves` (
	`profile_id` text PRIMARY KEY NOT NULL,
	`state_json` text NOT NULL,
	`version` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
