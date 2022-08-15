const
    // Config Imports
    config = require('../../../configuration/server.json')
const
    // Importing required modules
    {
        getDatabase, QueryBuilder, JWT

    } = require("../../../library/server/lib.utility.express"),
    // Extracting Packages
    Database = getDatabase(),
    // Database Table Extraction
    UserTable = new QueryBuilder().currentTable("users")
/**
 * @class LoginMiddleware
 * @author Dibesh Raj Subedi
 * @version 1.0.0
 * @description A middleware to check if user is logged in
 */
class LoginMiddleware {
    /**
     * @static 
     * @memberof LoginMiddleware
     * @description Checks If the User is Logged In
     */
    static checkLogin() {
        return (request, response, next) => {
            let Payload = {
                status: "error",
                success: false,
                result: "Unauthorized Access"
            }, StatusCode = 401,
                Escape = [];
            // check if requested url is not in array
            config.jwt.appliedEndPoints.forEach(endpoint => {
                if (request.url.includes(endpoint)) Escape.push(endpoint)
            })
            if (Escape.length == 0) {
                next();
                return;
            } else {
                // If other url check header containing JWT
                if (request.headers.authorization) {
                    // Extracting JWT from Header
                    const token = request.headers.authorization.split(" ")[1];
                    // Check IF Token Has Expired
                    try {
                        if (Date.now() >= JWT.verify(token, config.jwt.secret).exp * 1e3) {
                            Payload.result = "Token Expired, Please Login Again";
                            response.status(StatusCode).send(Payload);
                            return;
                        }
                        // Verifying JWT
                        JWT.verify(token, config.jwt.secret, (err, decoded) => {
                            if (err) response.status(StatusCode).send(Payload);
                            console.log(`Middleware triggered 🕛: decoded:`, decoded)
                            // On Identity Check is Successful
                            Database.executeQuery(
                                UserTable
                                    .select(QueryBuilder.selectType.ALL)
                                    .where(`UserId = ${decoded.UserId}`)
                                    .build()
                                , (res) => {
                                    if (res.status) next()
                                    else {
                                        Payload.result = "Unauthorized Access, Request Denied.";
                                        response.status(StatusCode).send(Payload);
                                    }
                                })
                        });
                    } catch (error) {
                        Payload.result = "Token Expired, Please Login Again";
                        response.status(StatusCode).send(Payload);
                    }
                } else response.status(StatusCode).send(Payload);
            }
        }
    }
}
module.exports = LoginMiddleware;