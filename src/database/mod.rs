mod error;

pub use self::error::DatabaseError;
pub use self::error::DatabaseResult;

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
            .unwrap()
        {
            let name = row
                .get_opt(0)
                .ok_or_else(DatabaseError::column_not_exists)?;

            result.push(name.map_err(DatabaseError::conversion_error)?);
        }

        Ok(result)
    }

    pub fn stage_names(&self, database: &str) -> DatabaseResult<Vec<String>> {
        let connection = self.connect(Some(database))?;
        let mut result = Vec::new();

        for row in &connection
            .query(include_str!("sql/stages.sql"), &[])
            .unwrap()
        {
            let name = row
                .get_opt(0)
                .ok_or_else(DatabaseError::column_not_exists)?;

            result.push(name.map_err(DatabaseError::conversion_error)?);
        }

        Ok(result)
    }

    pub fn data<F>(&self, database: &str, stage: &str, mut callback: F) -> DatabaseResult<()>
    where
        F: FnMut(&str, Timespec, Timespec, &str, &str),
    {
        let connection = self.connect(Some(database))?;

        for row in &connection
            .query(include_str!("sql/data.sql"), &[&stage])
            .unwrap()
        {
            let name: String = row
                .get_opt(0)
                .ok_or_else(DatabaseError::column_not_exists)?
                .map_err(DatabaseError::conversion_error)?;
            let start_time_str: String = row
                .get_opt(1)
                .ok_or_else(DatabaseError::column_not_exists)?
                .map_err(DatabaseError::conversion_error)?;
            let end_time_str: String = row
                .get_opt(2)
                .ok_or_else(DatabaseError::column_not_exists)?
                .map_err(DatabaseError::conversion_error)?;
            let group: String = row
                .get_opt(3)
                .ok_or_else(DatabaseError::column_not_exists)?
                .map_err(DatabaseError::conversion_error)?;
            let thread: String = row
                .get_opt(4)
                .ok_or_else(DatabaseError::column_not_exists)?
                .map_err(DatabaseError::conversion_error)?;
            let start_time = strptime(&start_time_str, "%Y-%m-%d %H:%M:%S,%f")
                .map_err(DatabaseError::time_parse_error)?
                .to_timespec();
            let end_time = strptime(&end_time_str, "%Y-%m-%d %H:%M:%S,%f")
                .map_err(DatabaseError::time_parse_error)?
                .to_timespec();

            callback(&name, start_time, end_time, &group, &thread);
        }

        Ok(())
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
