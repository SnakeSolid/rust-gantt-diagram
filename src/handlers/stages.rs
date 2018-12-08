use super::util;
use super::HandlerError;
use crate::database::PostgreSQL;
use iron::middleware::Handler;
use iron::IronResult;
use iron::Request as IronRequest;
use iron::Response as IronResponse;

#[derive(Debug)]
pub struct StagesHandler {}

impl StagesHandler {
    pub fn new() -> StagesHandler {
        StagesHandler {}
    }
}

impl Handler for StagesHandler {
    fn handle(&self, request: &mut IronRequest) -> IronResult<IronResponse> {
        util::handle_request(request, move |request: Request| {
            let postgres = PostgreSQL::new(
                &request.server,
                request.port,
                &request.user,
                &request.password,
            );

            postgres
                .stage_names(&request.database)
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
    database: String,
}
