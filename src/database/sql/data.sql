select
	name,
	start_date,
	end_date,
	target_group,
	coalesce(thread_name, '~') as thread_name
from engine.target
where maker_name = $1
	and start_date is not null
	and end_date is not null
order by start_date
