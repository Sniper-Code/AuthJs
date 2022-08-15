require('dotenv').config()

/**
 * @swagger
 * tags:
 *  name: User
 *  description: Endpoint to handle User related operations
 *  url: /api/user
 */

const
    // Importing required modules
    {
        Router, ExpressValidator, SHA_512,
        csrfProtection,
        ServerConfig, getDatabase,
        QueryBuilder, JWT
    } = require("../../../library/server/lib.utility.express"),
    // Extracting Packages
    Database = getDatabase(),
    // Extracting ExpressValidator from util
    { check, validationResult } = ExpressValidator,
    UserTable = new QueryBuilder().currentTable("users"),
    // Preparing Columns
    User = {
        InsertColumns: ["UserName", "FullName", "Email", "PASSWORD"],
        SelectColumns: ["UserId", "UserName", "FullName", "Email", "IsLoggedIn", "CreatedAt", "UpdatedAt"],
        UpdateFullName: ["FullName"],
        SelectResetColumns: ["UserId", "UserName", "Email", "PASSWORD"],
        Block: ["IsDisabled"]
    }
// Extracting Router from util
UserRouter = Router();
/**
* @swagger
* /api/user/first_name:
*  post:
*      tags: [User]
*      summary: Updates users first name only, accessible to all -> Requires Access Token
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
*                          FullName:
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
*                                  example: "Updated Successful."
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
*                                  example: "UserId Or Email not found in the request or might be invalid"
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
*                                  example: "UnAuthorized"
*/
UserRouter
    .post('/first_name',
        // Checking for CSRF Token
        csrfProtection,
        // Validation Check
        [
            check("FullName", "Fullname is required").notEmpty(),
            check(['UserId']).not().isEmpty(),
            check("UserId").isNumeric(true)
        ],
        (request, response) => {
            let Payload = {
                success: false,
                status: "error",
                result: "UserId or Fullname not found in the request.",
            },
                statusCode = 400,
                statusMessage = "Bad Request";
            // Error Check from Request
            if (!validationResult(request).isEmpty()) {
                Payload.success = false;
                Payload.status = "error";
                Payload.result = "UserId or Fullname not found in the request or might be invalid.";
                statusCode = 400;
                statusMessage = "Bad Request";
                // Logging the response
                console.log(`📶  [${statusCode} ${statusMessage}] with PAYLOAD [${JSON.stringify(Payload)}]`);
                // Sending the response
                response.status(statusCode).send(Payload);
            } else {

                // Decode JWT and Verify UserId
                JWT.verify(request.headers.authorization.split(" ")[1], ServerConfig.jwt.secret, (err, decoded) => {
                    if (err) response.status(StatusCode).send(Payload);
                    // On Identity Check is Successful
                    if (decoded.UserId == request.body.UserId) {
                        Database
                            .executeQuery(
                                UserTable.
                                    update(User.UpdateFullName, [`'${request.body.FullName}'`])
                                    .where(`UserId = ${request.body.UserId}`)
                                    .build(),
                                (res) => {
                                    if (res.status) {
                                        Payload.success = true;
                                        Payload.status = "success";
                                        Payload.result = "Update Successful! Redirecting to Login Page.";
                                        statusCode = 200;
                                        statusMessage = "Ok";
                                        // Logging the response
                                        console.log(`📶  [${statusCode} ${statusMessage}] with PAYLOAD [${JSON.stringify(Payload)}]`);
                                        // Sending the response
                                        response.status(statusCode).send(Payload);
                                    }
                                    else {
                                        // Error
                                        Payload.success = false;
                                        Payload.status = "error";
                                        Payload.result = "Problem in updating user Fullname.";
                                        statusCode = 500;
                                        statusMessage = "Internal Server Error";
                                        // Logging the response
                                        console.log(`📶  [${statusCode} ${statusMessage}] with PAYLOAD [${JSON.stringify(Payload)}]`);
                                        // Sending the response
                                        response.status(statusCode).send(Payload);
                                    }
                                }
                            )
                    }
                });
            }
        })
/**
 * @swagger
 * /api/user/add:
 *  post:
 *      tags: [User]
 *      summary: Register a new user admin user -> Requires Access Token
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
UserRouter
    .post("/add",
        // Checking for CSRF Token
        csrfProtection,
        // Validation Check
        [
            check("username", "Username is required").notEmpty(),
            check('username', 'Username must be 6-16 characters long').isLength({ min: 5, max: 16 }),
            check("email", "Email is required").notEmpty(),
            check("email", "Email is not valid").isEmail(),
            check("fullname", "Fullname is required").notEmpty()
        ],
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
            } else {
                const
                    RandomPassword = SHA_512(request.body.email + "password" + process.env.HASHING_SECRET);
                // Insert User
                Database
                    .executeQuery(
                        UserTable
                            .insert(User.InsertColumns, [
                                `'${request.body.username}'`,
                                `'${request.body.fullname}'`,
                                `'${request.body.email}'`,
                                `'${RandomPassword}'`
                            ]).build(),
                        (createResp => {
                            if (createResp.status) {
                                // Fetch User
                                Database
                                    .executeQuery(
                                        UserTable
                                            .select(QueryBuilder.selectType.ALL)
                                            .where(`Email = '${request.body.email}' AND PASSWORD = '${RandomPassword}'`)
                                            .build(),
                                        (selectResp => {
                                            if (selectResp.status) {
                                                // Success
                                                Payload.success = true;
                                                Payload.status = "success";
                                                Payload.result = `User with Email ${request.body.email} created successfully.`;
                                                statusCode = 200;
                                                statusMessage = "Ok";
                                            } else {
                                                // Error
                                                Payload.success = false;
                                                Payload.status = "error";
                                                Payload.result = "Problem in fetching user.";
                                                statusCode = 500;
                                                statusMessage = "Internal Server Error";
                                                // Logging the response
                                                console.log(`📶  [${statusCode} ${statusMessage}] with PAYLOAD [${JSON.stringify(Payload)}]`);
                                                // Sending the response
                                                response.status(statusCode).send(Payload);
                                            }
                                        })
                                    )
                            }
                            else {
                                // Error
                                Payload.success = false;
                                Payload.status = "error";
                                Payload.result = "User Registration Failed, Username or Email already exists.";
                                statusCode = 500;
                                statusMessage = "Internal Server Error";
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
 * /api/user/delete:
 *  post:
 *      tags: [User]
 *      summary: Delete User -> Requires Access Token
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
 *                              type: number
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
 *                                  example: "User updated successfully"
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
UserRouter
    .post("/delete",
        csrfProtection,
        // Validation Check
        [
            check("UserId").not().isEmpty(),
            check("UserId").isNumeric(true)
        ],
        (request, response) => {
            let Payload = {
                success: false,
                status: "error",
                result: "AdminId not found in the request.",
            },
                statusCode = 400,
                statusMessage = "Bad Request";
            // Error Check from Request
            if (!validationResult(request).isEmpty()) {
                Payload.success = false;
                Payload.status = "error";
                Payload.result = "AdminId  not found in the request or might be invalid.";
                statusCode = 400;
                statusMessage = "Bad Request";
                // Logging the response
                console.log(`📶  [${statusCode} ${statusMessage}] with PAYLOAD [${JSON.stringify(Payload)}]`);
                // Sending the response
                response.status(statusCode).send(Payload);
            } else {
                Database
                    .executeQuery(
                        UserTable
                            .select(QueryBuilder.selectType.ALL)
                            .where(`UserId = ${request.body.UserId}`)
                            .build(),
                        (userRef => {
                            if (userRef.status && userRef.rows.length != 0) {
                                // Delete User
                                Database
                                    .executeQuery(
                                        UserTable
                                            .delete()
                                            .where(`UserId = ${request.body.UserId}`)
                                            .build(),
                                        (res => {
                                            if (res.status) {
                                                Payload.success = true;
                                                Payload.status = "success";
                                                Payload.result = "User deleted successfully.";
                                                statusCode = 200;
                                                statusMessage = "ok";
                                                // Logging the response
                                                console.log(`📶  [${statusCode} ${statusMessage}] with PAYLOAD [${JSON.stringify(Payload)}]`);
                                                // Sending the response
                                                response.status(statusCode).send(Payload);
                                            } else {
                                                Payload.success = false;
                                                Payload.status = "error";
                                                Payload.result = "Unable to delete user.";
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
                                // Not Found
                                Payload.success = false;
                                Payload.status = "error";
                                Payload.result = "User Not found";
                                statusCode = 404;
                                statusMessage = "Not Found";
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
* /api/user/view:
*  get:
*      tags: [User]
*      summary: Retrieves User List -> Requires Access Token
*      parameters:
*          - in: header
*            name: X-CSRF-TOKEN
*            schema:
*              type: string
*            description: CSRF Token
*            required: true
*      security:
*          - bearerAuth: []
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
*                                  example: "Ok."
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
 */
UserRouter
    .get("/view",
        csrfProtection,
        (request, response) => {
            let Payload = {
                success: false,
                status: "error",
                result: "Token not found.",
            },
                statusCode = 400,
                statusMessage = "Bad Request";
            Database
                .executeQuery(
                    UserTable
                        .select(QueryBuilder.selectType.COLUMN, User.SelectColumns)
                        .build(),
                    (resp => {
                        if (resp.status) {
                            // Success
                            Payload.success = true;
                            Payload.status = "success";
                            Payload.result = resp.result;
                            statusCode = 200;
                            statusMessage = "Ok";
                            Payload.data = {
                                users: resp.rows,
                                length: resp.rows.length
                            }
                        } else {
                            // Error
                            Payload.success = false;
                            Payload.status = "error";
                            Payload.result = "Users not found.";
                            statusCode = 400;
                            statusMessage = "Bad Request";
                        }
                        // Logging the response
                        console.log(`📶  [${statusCode} ${statusMessage}] with PAYLOAD [${JSON.stringify(Payload)}]`);
                        // Sending the response
                        response.status(statusCode).send(Payload);
                    })
                )
        })
    ;
// Exporting UserRouter
module.exports = UserRouter;
