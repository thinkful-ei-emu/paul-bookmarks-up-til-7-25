CREATE EXTENSION if not exists "uuid-ossp";
create table if not exists bookmarks (
	id uuid primary key unique default uuid_generate_v4 (),
	title text not null,
	url text not null,
	description text,
	rating integer
);