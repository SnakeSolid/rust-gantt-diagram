mod error;

pub use self::error::DatabaseError;
pub use self::error::DatabaseResult;

use fallible_iterator::FallibleIterator;
use postgres::params::ConnectParams;
use postgres::params::Host;
use postgres::Connection;
use postgres::TlsMode;
use time::strptime;
use time::Timespec;

#[derive(Debug)]
pub struct PostgreSQL {
    server: String,
    port: u16,
    user: String,
    password: String,
}

const DEFAULT_DATABASE: &str = "postgres";
const FETCH_LIMIT: i32 = 1_000;

impl PostgreSQL {
    pub fn new(server: &str, port: u16, user: &str, password: &str) -> PostgreSQL {
        PostgreSQL {
            server: server.into(),
            port: port,
            user: user.into(),
            password: password.into(),
        }
    }

    pub fn database_names(&self) -> DatabaseResult<Vec<String>> {
        let connection = self.connect(None)?;
        let mut result = Vec::new();

        for row in &connection
            .query(include_str!("sql/databases.sql"), &[])
            .map_err(DatabaseError::query_execution_error)?
        {
            let name = row
                .get_opt(0)
                .ok_or_else(DatabaseError::column_not_exists)?;

            result.push(
                name.map_err(|error| DatabaseError::conversion_error(error, "database name"))?,
            );
        }

        Ok(result)
    }

    pub fn stage_names(&self, database: &str) -> DatabaseResult<Vec<String>> {
        let connection = self.connect(Some(database))?;
        let mut result = Vec::new();

        for row in &connection
            .query(include_str!("sql/stages.sql"), &[])
            .map_err(DatabaseError::query_execution_error)?
        {
            let name = row
                .get_opt(0)
                .ok_or_else(DatabaseError::column_not_exists)?;

            result
                .push(name.map_err(|error| DatabaseError::conversion_error(error, "maker name"))?);
        }

        Ok(result)
    }

    pub fn data<F, E>(
        &self,
        database: &str,
        stage: &str,
        mut callback: F,
    ) -> DatabaseResult<Result<(), E>>
    where
        F: FnMut(&str, Timespec, Timespec, &str, &str) -> Result<(), E>,
    {
        let connection = self.connect(Some(database))?;
        let statement = connection
            .prepare(include_str!("sql/data.sql"))
            .map_err(DatabaseError::prepare_query_error)?;
        let transaction = connection
            .transaction()
            .map_err(DatabaseError::transaction_error)?;
        let mut rows = statement
            .lazy_query(&transaction, &[&stage], FETCH_LIMIT)
            .map_err(DatabaseError::query_execution_error)?;

        while let Some(row) = rows.next().map_err(DatabaseError::query_execution_error)? {
            let name: String = row
                .get_opt(0)
                .ok_or_else(DatabaseError::column_not_exists)?
                .map_err(|error| DatabaseError::conversion_error(error, "name"))?;
            let start_time_str: String = row
                .get_opt(1)
                .ok_or_else(DatabaseError::column_not_exists)?
                .map_err(|error| DatabaseError::conversion_error(error, "start tame"))?;
            let end_time_str: String = row
                .get_opt(2)
                .ok_or_else(DatabaseError::column_not_exists)?
                .map_err(|error| DatabaseError::conversion_error(error, "end time"))?;
            let group: String = row
                .get_opt(3)
                .ok_or_else(DatabaseError::column_not_exists)?
                .map_err(|error| DatabaseError::conversion_error(error, "group name"))?;
            let thread: String = row
                .get_opt(4)
                .ok_or_else(DatabaseError::column_not_exists)?
                .map_err(|error| DatabaseError::conversion_error(error, "thread name"))?;
            let start_time = strptime(&start_time_str, "%Y-%m-%d %H:%M:%S,%f")
                .map_err(DatabaseError::time_parse_error)?
                .to_timespec();
            let end_time = strptime(&end_time_str, "%Y-%m-%d %H:%M:%S,%f")
                .map_err(DatabaseError::time_parse_error)?
                .to_timespec();

            if let Err(err) = callback(&name, start_time, end_time, &group, &thread) {
                return Ok(Err(err));
            }
        }

        Ok(Ok(()))
    }

    fn connect(&self, database: Option<&str>) -> DatabaseResult<Connection> {
        let password = Some(self.password.as_str()).filter(|w| !w.is_empty());
        let params = ConnectParams::builder()
            .port(self.port)
            .user(&self.user, password)
            .database(database.unwrap_or(DEFAULT_DATABASE))
            .build(Host::Tcp(self.server.clone()));

        Connection::connect(params, TlsMode::None).map_err(DatabaseError::connection_error)
    }
}
