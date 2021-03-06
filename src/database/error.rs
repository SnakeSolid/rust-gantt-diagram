use postgres::Error as PgError;
use std::error::Error;
use std::fmt::Display;
use std::fmt::Formatter;
use std::fmt::Result as FmtResult;
use time::ParseError as TimeParseError;

pub type DatabaseResult<T> = Result<T, DatabaseError>;

#[derive(Debug)]
pub enum DatabaseError {
    ConnectionError { message: String },
    QueryExecutionError { message: String },
    PrepareQueryError { message: String },
    TransactionError { message: String },
    ConversionError { message: String, column: String },
    TimeParseError { message: String },
    ColumnNotExists,
}

impl DatabaseError {
    pub fn connection_error(error: PgError) -> DatabaseError {
        DatabaseError::ConnectionError {
            message: format!("{}", error),
        }
    }

    pub fn query_execution_error(error: PgError) -> DatabaseError {
        DatabaseError::QueryExecutionError {
            message: format!("{}", error),
        }
    }

    pub fn prepare_query_error(error: PgError) -> DatabaseError {
        DatabaseError::PrepareQueryError {
            message: format!("{}", error),
        }
    }

    pub fn transaction_error(error: PgError) -> DatabaseError {
        DatabaseError::TransactionError {
            message: format!("{}", error),
        }
    }

    pub fn conversion_error(error: PgError, column: &str) -> DatabaseError {
        warn!("Conversion error for column `{}`: {}", column, error);

        DatabaseError::ConversionError {
            message: format!("{}", error),
            column: column.into(),
        }
    }

    pub fn time_parse_error(error: TimeParseError) -> DatabaseError {
        warn!("Time parse error: {}", error);

        DatabaseError::TimeParseError {
            message: format!("{}", error),
        }
    }

    pub fn column_not_exists() -> DatabaseError {
        warn!("Column does not exists");

        DatabaseError::ColumnNotExists
    }
}

impl Error for DatabaseError {}

impl Display for DatabaseError {
    fn fmt(&self, f: &mut Formatter) -> FmtResult {
        match self {
            DatabaseError::ConnectionError { message } => write!(f, "{}", message),
            DatabaseError::QueryExecutionError { message } => write!(f, "{}", message),
            DatabaseError::PrepareQueryError { message } => write!(f, "{}", message),
            DatabaseError::TransactionError { message } => write!(f, "{}", message),
            DatabaseError::ConversionError { message, column } => {
                write!(f, "Conversion error for column `{}`: {}", column, message)
            }
            DatabaseError::TimeParseError { message } => write!(f, "{}", message),
            DatabaseError::ColumnNotExists => write!(f, "Column does not exists"),
        }
    }
}
