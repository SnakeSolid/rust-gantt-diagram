use super::util;
use super::HandlerError;
use crate::database::PostgreSQL;
use iron::middleware::Handler;
use iron::IronResult;
use iron::Request as IronRequest;
use iron::Response as IronResponse;

#[derive(Debug)]
pub struct DatabasesHandler {}

impl DatabasesHandler {
    pub fn new() -> DatabasesHandler {
        DatabasesHandler {}
    }
}

impl Handler for DatabasesHandler {
    fn handle(&self, request: &mut IronRequest) -> IronResult<IronResponse> {
        util::handle_request(request, move |request: Request| {
            let postgres = PostgreSQL::new(
                &request.server,
                request.port,
                &request.user,
                &request.password,
            );

            postgres
                .database_names()
                .map_err(|e| HandlerError::new(&e.to_string()))
        })
    }
}

#[derive(Debug, Deserialize)]
struct Request {
    server: String,
    port: u16,
    user: String,
    password: String,
}
