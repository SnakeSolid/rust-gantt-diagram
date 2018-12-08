select
	datname
from pg_database
where datistemplate = false
order by datname
