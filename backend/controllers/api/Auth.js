require('dotenv').config()
/**
 * @swagger
 * tags:
 *  name: Auth
 *  description: Endpoint to handle Auth related operations
 *  url: /api/auth
 * components:
 *  securitySchemes:
 *      bearerAuth:
 *          type: http
 *          scheme: bearer
 *          in: header
 *          name: Authorization
 *          description: Bearer Token
 *          bearerFormat: JWT
 */
// Note: Expiration token is set based on minutes and seconds-> eg to set 1hr just set 3600 in expiry config
const
    // Importing required modules
    {
        Router, ExpressValidator, SHA_512, csrfProtection,
        ServerConfig, getDatabase, QueryBuilder, JWT

    } = require("../../../library/server/lib.utility.express"),
    // Extracting Packages
    Database = getDatabase(),
    // Extracting Router from util
    AuthRouter = Router(),
    // Extracting ExpressValidator from util
    { check, validationResult } = ExpressValidator,
    // Database Table Extraction
    UserTable = new QueryBuilder().currentTable("users"),
    // Preparing Columns
    User = {
        InsertColumns: ["UserName", "FullName", "Email", "PASSWORD"],
        SelectResetColumns: ["UserId", "UserName", "Email", "PASSWORD"],
        SelectColumns: ["UserId", "UserName", "FullName", "Email", "IsLoggedIn", "CreatedAt", "UpdatedAt"],
        UpdateLogin: ["IsLoggedIn"]
    }
    ;
/** 
 * @swagger
 * /api/auth/csrf:
 *  get:
 *      summary: Get CSRF token
 *      tags: [Auth]
 *      responses:
 *          200:
 *              description: Success
 *              content: 
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              success:
 *                                  type: boolean
 *                                  example: true  
 *                              status:
 *                                  type: string
 *                                  example: success
 *                              result:
 *                                  type: object
 *                                  example:
 *                                         {
 *                                              CsrfToken: "token"
 *                                          }
 */
AuthRouter
    .get("/csrf",
        csrfProtection,
        (request, response) => {
            let
                Payload = {
                    success: true,
                    status: "success",
                    result: {
                        CsrfToken: request.csrfToken(),
                    },
                },
                statusCode = 200,
                statusMessage = "Ok";
            // Logging the response
            console.log(`📶 [${statusCode} ${statusMessage}] with PAYLOAD [${JSON.stringify(Payload)}]`);
            // Sending the response
            response.status(statusCode).send(Payload);
        })
/**
 * @swagger
 * /api/auth/login:
 *  post:
 *      tags: [Auth]
 *      summary: Login User with Email and Password -> Returns Details and Access Token
 *      parameters:
 *          - in: header
 *            name: X-CSRF-TOKEN
 *            schema:
 *              type: string
 *            description: CSRF Token
 *            required: true
 *      requestBody:
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          email:
 *                              type: string
 *                              required: true
 *                              format: email
 *                          password:
 *                              type: string
 *                              required: true
 *      responses:
 *          200:
 *              description: Success
 *              content: 
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              success:
 *                                  type: boolean
 *                                  example: true  
 *                              status:
 *                                  type: string
 *                                  example: success
 *                              result:
 *                                  type: string
 *                                  example: "Login Successful, Redirecting"
 *          400:
 *              description: Bad Request
 *              content: 
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              success:
 *                                  type: boolean
 *                                  example: false  
 *                              status:
 *                                  type: string
 *                                  example: error
 *                              result:
 *                                  type: string
 *                                  example: "Email or Password not found in the request."
 *          401:
 *              description: Unauthorized
 *              content: 
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              success:
 *                                  type: boolean
 *                                  example: false  
 *                              status:
 *                                  type: string
 *                                  example: error
 *                              result:
 *                                  type: string
 *                                  example: "Your account is disabled. Contact Admin for more details."
 *          403:
 *              description: Forbidden
 *              content: 
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              success:
 *                                  type: boolean
 *                                  example: false  
 *                              status:
 *                                  type: string
 *                                  example: error
 *                              result:
 *                                  type: string
 *                                  example: "Email is not verified."
 *          500:
 *              description: Internal Server Error
 *              content: 
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              success:
 *                                  type: boolean
 *                                  example: false  
 *                              status:
 *                                  type: string
 *                                  example: error
 *                              result:
 *                                  type: string
 *                                  example: "Login Request Failed, Please Try Again Later"
 */
AuthRouter.post("/login",
    // Checking for CSRF Token
    csrfProtection,
    // Validation Check
    [
        check("password", "Password is required").notEmpty(),
        check('password', 'Password must be 8-20 characters long').isLength({ min: 8, max: 20 }),
        check("email", "Email is required").notEmpty(),
        check("email", "Email is not valid").isEmail(),
    ],
    // Request Handel
    (request, response) => {
        let Payload = {
            success: false,
            status: "error",
            result: "Email or Password not found in the request.",
            data: {}
        },
            statusCode = 400,
            statusMessage = "Bad Request";
        // Error Check from Request
        if (!validationResult(request).isEmpty()) {
            Payload.success = false;
            Payload.status = "error";
            Payload.result = "Email or Password not found in the request or might be invalid.";
            Payload.data = {};
            statusCode = 400;
            statusMessage = "Bad Request";
            // Logging the response
            console.log(`📶  [${statusCode} ${statusMessage}] with PAYLOAD [${JSON.stringify(Payload)}]`);
            // Sending the response
            response.status(statusCode).send(Payload);
        }
        // When All Request Condition Satisfies
        else {
            // Extracting Email and Password
            const
                Email = request.body.email,
                Password = SHA_512(request.body.email + request.body.password + process.env.HASHING_SECRET);
            // Check Database for User
            Database
                .executeQuery(
                    UserTable
                        .select(QueryBuilder.selectType.ALL)
                        .where(`Email = '${Email}' AND PASSWORD = '${Password}'`)
                        .build(),
                    (resp_i => {
                        // Checks Success Result
                        if (resp_i.status) {
                            if (resp_i.rows.length != 0) {
                                // Extracting User Data
                                const {
                                    UserId, UserName, FullName,
                                    Email, IsLoggedIn, CreatedAt
                                } = resp_i.rows[0];
                                // Update isLoggedIn to 1
                                Database
                                    .executeQuery(
                                        UserTable
                                            .update(User.UpdateLogin, [true])
                                            .where(`UserId = '${UserId}'`)
                                            .build(),
                                        (resUp => {
                                            if (resUp.status) {
                                                // Generate JWT Token
                                                const
                                                    expiresIn = ServerConfig.jwt.expiry;
                                                let access = JWT
                                                    .sign({
                                                        UserId, Email,
                                                    }, ServerConfig.jwt.secret, { expiresIn }),
                                                    user = {
                                                        UserId, UserName, FullName,
                                                        Email, IsLoggedIn, CreatedAt
                                                    }
                                                    ;
                                                // Create Payload
                                                Payload.success = true;
                                                Payload.status = "success";
                                                Payload.result = "Login Successful, Redirecting....";
                                                // Send Token + Selected Payload To Client
                                                Payload.data = {
                                                    user,
                                                    access
                                                }
                                                statusCode = 200;
                                                statusMessage = "Ok";
                                                // Logging the response
                                                console.log(`📶  [${statusCode} ${statusMessage}] with PAYLOAD [${JSON.stringify(Payload)}]`);
                                                // Sending the response
                                                response.status(statusCode).send(Payload);
                                            } else {
                                                Payload.success = false;
                                                Payload.status = "error";
                                                Payload.result = "Login Request Failed, Please Try Again Later.";
                                                Payload.data = {};
                                                statusCode = 500;
                                                statusMessage = "Internal Server Error";
                                                // Logging the response
                                                console.log(`📶  [${statusCode} ${statusMessage}] with PAYLOAD [${JSON.stringify(Payload)}]`);
                                                // Sending the response
                                                response.status(statusCode).send(Payload);
                                            }
                                        })
                                    )
                            } else {
                                Payload.success = false;
                                Payload.status = "error";
                                Payload.result = "User not found, Make sure you have entered correct email and password.";
                                Payload.data = {};
                                statusCode = 400;
                                statusMessage = "Bad Request";
                                // Logging the response
                                console.log(`📶  [${statusCode} ${statusMessage}] with PAYLOAD [${JSON.stringify(Payload)}]`);
                                // Sending the response
                                response.status(statusCode).send(Payload);
                            }
                        } else {
                            Payload.success = false;
                            Payload.status = "error";
                            Payload.result = "Invalid Email or Password.";
                            Payload.data = {};
                            statusCode = 400;
                            statusMessage = "Bad Request";
                            // Logging the response
                            console.log(`📶  [${statusCode} ${statusMessage}] with PAYLOAD [${JSON.stringify(Payload)}]`);
                            // Sending the response
                            response.status(statusCode).send(Payload);
                        }
                    })
                )

        }
    })
/**
 * @swagger
 * /api/auth/logout:
 *  post:
 *      tags: [Auth]
 *      summary: Logout User -> Requires Access Token
 *      parameters:
 *          - in: header
 *            name: X-CSRF-TOKEN
 *            schema:
 *              type: string
 *            description: CSRF Token
 *            required: true
 *      security:
 *          - bearerAuth: []
 *      requestBody:
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          UserId:
 *                              type: integer
 *                              required: true
 *                              format: number
 *      responses:
 *          200:
 *              description: Success
 *              content: 
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              success:
 *                                  type: boolean
 *                                  example: true  
 *                              status:
 *                                  type: string
 *                                  example: success
 *                              result:
 *                                  type: string
 *                                  example: "Logout Successful."
 *          400:
 *              description: Bad Request
 *              content: 
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              success:
 *                                  type: boolean
 *                                  example: false  
 *                              status:
 *                                  type: string
 *                                  example: error
 *                              result:
 *                                  type: string
 *                                  example: "UserId not found in the request or might be invalid"
 *          401:
 *              description: Unauthorized
 *              content: 
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              success:
 *                                  type: boolean
 *                                  example: false  
 *                              status:
 *                                  type: string
 *                                  example: error
 *                              result:
 *                                  type: string
 *                                  example: "Your account is disabled. Contact Admin for more details."
 */
AuthRouter
    .post('/logout',
        // User Id Check
        [
            check(['UserId']).not().isEmpty(),
            check(['UserId']).isNumeric(true)
        ],
        // Handle Request
        (request, response) => {
            let Payload = {
                success: true,
                status: "success",
                result: "Logout Successful.",
            },
                statusCode = 200,
                statusMessage = "Ok";
            // Error Check from Request
            if (!validationResult(request).isEmpty()) {
                Payload.success = false;
                Payload.status = "error";
                Payload.result = "UserId not found in the request or might be invalid.";
                Payload.data = {};
                statusCode = 400;
                statusMessage = "Bad Request";
                // Logging the response
                console.log(`📶  [${statusCode} ${statusMessage}] with PAYLOAD [${JSON.stringify(Payload)}]`);
                // Sending the response
                response.status(statusCode).send(Payload);
            } else {
                if (request.body.UserId != null) {
                    // Setting Is LoggedIn to False
                    // Update isLoggedIn to 1
                    Database
                        .executeQuery(
                            UserTable
                                .update(User.UpdateLogin, [false])
                                .where(`UserId = '${request.body.UserId}'`)
                                .build(),
                            () => { }
                        )
                } else {
                    Payload.success = false;
                    Payload.status = "error";
                    Payload.result = "Invalid request, Please check your request.";
                    statusCode = 400;
                    statusMessage = "Bad Request";
                }
                // Logging the response
                console.log(`📶  [${statusCode} ${statusMessage}] with PAYLOAD [${JSON.stringify(Payload)}]`);
                // Sending the response
                response.status(statusCode).send(Payload);
            }
        })
/**
 * @swagger
 * /api/auth/register:
 *  post:
 *      tags: [Auth]
 *      summary: Register a new user
 *      parameters:
 *          - in: header
 *            name: X-CSRF-TOKEN
 *            schema:
 *              type: string
 *            description: CSRF Token
 *            required: true
 *      requestBody:
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          username:
 *                              type: string
 *                              required: true
 *                          fullname:
 *                              type: string
 *                              required: true
 *                          email:
 *                              type: string
 *                              required: true
 *                              format: email
 *                          password:
 *                              type: string
 *                              required: true
 *      responses:
 *          200:
 *              description: Success
 *              content: 
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              success:
 *                                  type: boolean
 *                                  example: true  
 *                              status:
 *                                  type: string
 *                                  example: success
 *                              result:
 *                                  type: string
 *                                  example: "User registered successfully"
 *          400:
 *              description: Bad Request
 *              content: 
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              success:
 *                                  type: boolean
 *                                  example: false  
 *                              status:
 *                                  type: string
 *                                  example: error
 *                              result:
 *                                  type: string
 *                                  example: "Username, Password, Email or Fullname not found in the request or might be invalid."
 *          500:
 *              description: Internal Server Error
 *              content: 
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              success:
 *                                  type: boolean
 *                                  example: false  
 *                              status:
 *                                  type: string
 *                                  example: error
 *                              result:
 *                                  type: string
 *                                  example: "User Registration Failed, Please Try Again Later."
 */
AuthRouter.post("/register",
    // Checking for CSRF Token
    csrfProtection,
    // Validation Check
    [
        check("username", "Username is required").notEmpty(),
        check('username', 'Username must be 6-16 characters long').isLength({ min: 5, max: 16 }),
        check("password", "Password is required").notEmpty(),
        check('password', 'Password must be 8-20 characters long').isLength({ min: 8, max: 20 }),
        check("email", "Email is required").notEmpty(),
        check("email", "Email is not valid").isEmail(),
        check("fullname", "Fullname is required").notEmpty(),
    ],
    // Request Handel
    (request, response) => {
        let Payload = {
            success: false,
            status: "error",
            result: "Username, Password, Email or Fullname not found in the request.",
        },
            statusCode = 400,
            statusMessage = "Bad Request";
        // Error Check from Request
        if (!validationResult(request).isEmpty()) {
            Payload.success = false;
            Payload.status = "error";
            Payload.result = "Username, Password, Email or Fullname not found in the request or might be invalid.";
            statusCode = 400;
            statusMessage = "Bad Request";
            // Logging the response
            console.log(`📶  [${statusCode} ${statusMessage}] with PAYLOAD [${JSON.stringify(Payload)}]`);
            // Sending the response
            response.status(statusCode).send(Payload);
        }
        // When All Request Condition Satisfies
        else {
            Database
                .executeQuery(
                    UserTable
                        .insert(User.InsertColumns, [
                            `'${request.body.username}'`,
                            `'${request.body.fullname}'`,
                            `'${request.body.email}'`,
                            `'${SHA_512(request.body.email + request.body.password + process.env.HASHING_SECRET)}'`,
                        ]).build(),
                    (res => {
                        if (res.status) {
                            // Success Response
                            Payload.success = true;
                            Payload.status = "success";
                            Payload.result = `User Registered Successfully!`;
                            statusCode = 200;
                            statusMessage = "Ok";
                        }
                        else {
                            // Error
                            Payload.success = false;
                            Payload.status = "error";
                            Payload.result = "User Registration Failed, Username or Email already exists.";
                            statusCode = 500;
                            statusMessage = "Internal Server Error";
                        }
                        // Logging the response
                        console.log(`📶  [${statusCode} ${statusMessage}] with PAYLOAD [${JSON.stringify(Payload)}]`);
                        // Sending the response
                        response.status(statusCode).send(Payload);
                    })
                )
        }
    })

/**
* @swagger
* /api/auth/login_check:
*  post:
*      tags: [Auth]
*      summary: Check user Login -> Requires Access Token
*      parameters:
*          - in: header
*            name: X-CSRF-TOKEN
*            schema:
*              type: string
*            description: CSRF Token
*            required: true
*      security:
*          - bearerAuth: []
*      requestBody:
*          content:
*              application/json:
*                  schema:
*                      type: object
*                      properties:
*                          UserId:
*                              type: integer
*                              required: true
*                              format: number
*      responses:
*          200:
*              description: Success
*              content: 
*                  application/json:
*                      schema:
*                          type: object
*                          properties:
*                              success:
*                                  type: boolean
*                                  example: true  
*                              status:
*                                  type: string
*                                  example: success
*                              result:
*                                  type: string
*                                  example: "Logout Successful."
*          400:
*              description: Bad Request
*              content: 
*                  application/json:
*                      schema:
*                          type: object
*                          properties:
*                              success:
*                                  type: boolean
*                                  example: false  
*                              status:
*                                  type: string
*                                  example: error
*                              result:
*                                  type: string
*                                  example: "UserId not found in the request or might be invalid"
*          401:
*              description: Unauthorized
*              content: 
*                  application/json:
*                      schema:
*                          type: object
*                          properties:
*                              success:
*                                  type: boolean
*                                  example: false  
*                              status:
*                                  type: string
*                                  example: error
*                              result:
*                                  type: string
*                                  example: "Your account is disabled. Contact Admin for more details."
*/
AuthRouter.post("/login_check",
    // Checking for CSRF Token
    csrfProtection,
    // User Id Check
    [
        check(['UserId']).not().isEmpty(),
        check(['UserId']).isNumeric(true)
    ],
    (request, response) => {
        let Payload = {
            status: "error",
            success: false,
            result: "Unauthorized Access, Please Login First"
        }, StatusCode = 401,
            statusMessage = "Unauthorized";
        if (!validationResult(request).isEmpty()) {
            Payload.success = false;
            Payload.status = "error";
            Payload.result = "UserId not found in the request or might be invalid.";
            Payload.data = {};
            StatusCode = 400;
            statusMessage = "Bad Request";
            // Logging the response
            console.log(`📶  [${StatusCode} ${statusMessage}] with PAYLOAD [${JSON.stringify(Payload)}]`);
            // Sending the response
            response.status(StatusCode).send(Payload);
        }
        else {
            // If other url check header containing JWT
            if (request.headers.authorization) {
                // Extracting JWT from Header
                const token = request.headers.authorization.split(" ")[1];
                // Check IF Token Has Expired
                if (Date.now() >= JWT.verify(token, ServerConfig.jwt.secret).exp * 1e3) {
                    Payload.status = "error";
                    Payload.success = false;
                    Payload.result = "Token Expired, Please Login Again";
                    StatusCode = 401;
                    statusMessage = "Unauthorized";
                }
                else {
                    // Verifying JWT
                    JWT.verify(token, ServerConfig.jwt.secret, (err, decoded) => {
                        // On Identity Check is Successful
                        if (decoded.UserId == request.body.UserId) {
                            Payload.success = true;
                            Payload.status = "success";
                            Payload.result = "User Already Logged In! Redirecting to Dashboard.";
                            StatusCode = 200;
                            statusMessage = "Ok";
                        }
                    });
                }
                // Logging the response
                console.log(`📶  [${StatusCode} ${statusMessage}] with PAYLOAD [${JSON.stringify(Payload)}]`);
                // Sending the response
                response.status(StatusCode).send(Payload);
            }
        }
    })
// Exporting AuthRouter
module.exports = AuthRouter;