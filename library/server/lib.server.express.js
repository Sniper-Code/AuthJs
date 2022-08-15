require('dotenv').config()

var
    /**
     * @description Importing Packages
     * @memberof Server
     */
    Packages = {
        /**
         * @description Importing Utils
         */
        Utils: require('./lib.utility.express'),
        /**
         * @description Importing Swagger
         * @references https://javascript.plainenglish.io/how-to-implement-and-use-swagger-in-nodejs-d0b95e765245
         */
        Swagger: {
            swaggerUI: require('swagger-ui-express'),
            swaggerJsDoc: require('swagger-jsdoc'),
        },
        /**
         * @description Importing OS
         */
        System: require('os'),
        /**
         * @description Importing Express
         */
        Express: require('express'),
        /**
         * @description Importing Cors
         */
        Cors: require('cors'),
        /**
         * @description Importing Cookie Parser 
         */
        CookieParser: require('cookie-parser'),
        /**
         * @description Importing Helmet 
         */
        Helmet: require('helmet'),
        /**
         * @description Importing Xss Clean 
         */
        XSS: require('xss-clean'),
    },
    /**
     * @description Importing  Middleware
     * @memberof Server
     */
    MiddleWare = {
        /**  
         * @description Importing SQLInjection Middleware
         */
        SQLInjection: require('./middleware/lib.injection.filter.sql').filter,
        /**
         * @description Importing Loggedin Middleware
         */
        LoggedIn: require('./middleware/lib.auth.loggedin').checkLogin,
        /**
         * @description Importing Logout Hijack Middleware
         */
        LogoutHijack: require('./middleware/lib.session.expired').checkExpiry
    },
    /**
     * @description Importing Configurations
     * @memberof Server
     */
    Configurations = {
        /**
         * @description Importing Server Configuration
         */
        Server: Packages.Utils.ServerConfig,
        /**
         * @description Importing Swagger Configuration
         */
        Swagger: require('../../configuration/swagger.json')
    }
    ;
/**
 * @class Server
 * @description Server that serves the application
 * @author Dibesh Raj Subedi
 * @version 1.0.0
 */
class Server {
    /**
     * @description define server variables
     * @memberof Server
     * @returns {Server}
     */
    #defineServerVariables() {
        const Config = Configurations.Server
        this.PORT = process.env.PORT || 8080;
        this.preventSqlInjection = Config.server.preventions.sqLInjection;
        this.preventLogoutSessionHijack = Config.server.preventions.logoutSessionHijack;
        this.preventCsp = Config.server.preventions.preventCsp;

        // Check if production mode
        this.isDevelopmentMode = Packages.Utils.DevelopmentEnv;
        console.log(`📡 Server is running in ${this.isDevelopmentMode ? 'Development' : 'Production'} mode`);
        // Extracting Multer Configuration
        return this;
    }

    /**
     * @description Activates the HTTPS server with defined configuration
     * @memberof Server
     * @returns {Server}
     */
    async #activateHttp() {
        const
            { XSS, Helmet, Cors, Express, CookieParser } = Packages,
            { SQLInjection, LoggedIn, LogoutHijack } = MiddleWare;
        // Check if the Frontend build is completed
        this.server
            // Hiding the server information
            .disable('x-powered-by')
            // Preventing XSS Attacks
            .use(XSS())
            // Setting UP Cors for Cross Origin Resource Sharing
            .use(Cors({
                origin: `http://localhost:${this.PORT}`
            }))
            // Parse requests of content-type - application/json
            .use(Express.json())
            // Parse requests of content-type - application/x-www-form-urlencoded
            .use(Express.urlencoded({ extended: true }))
            //  Parse Cookie for Server
            .use(CookieParser());

        // Using Helmet to configure security headers and CSP
        if (this.preventCsp) this.server.use(Helmet());
        // Preventing Logout Session Hijacking
        if (this.preventLogoutSessionHijack) this.server.use(LogoutHijack());
        // Logging Middleware
        this.server.use(LoggedIn())
        // Preventing Sql Injection Attacks
        if (this.preventSqlInjection) this.server.use(SQLInjection());
        return this;
    }


    /**
     * @description Handle Routes for HTTP 
     * @memberof Server
     * @returns {Server}
     */
    #handleHttpRoutes() {
        // Router Imports 
        const { ApiRouter } = require('../../backend/router');
        // API ROUTER CONFIGURATION
        console.log(`🛠 Configuring HTTP Routes`);
        const Router = [ApiRouter];
        Router.forEach(router =>
            // Instantiating and Configuring the Router
            new router(this).setUpControllers());
        return this
    }

    /**
     * @description Handles the Errors for HTTP
     * @memberof Server
     * @returns {Server}
     */
    #handelHttpError() {
        this.server
            // Handling 404 Errors
            .get("*", (request, response) => {
                console.log(`✉ [404 Bad Request] with PAYLOAD [${JSON.stringify({ success: !1, status: 'error', result: 'Oops! Page not found!' })}]`);
                response
                    .status(404)
                    .send({ success: !1, status: 'error', result: 'Oops! Page not found!' });
            })
            // Handling CSRF Errors
            .use((error, request, response, next) => {
                console.log(`🐞 ${error.message} ${error.stack}\n`);
                if (error.code === 'EBADCSRFTOKEN') {
                    console.log(`✉ [403 Forbidden] with PAYLOAD [${JSON.stringify({ success: !1, status: 'error', result: 'Oops! Forbidden!' })}]`);
                    response
                        .status(403)
                        .send({ success: !1, status: 'error', result: 'Oops! Request Forbidden, Un-authorized Request!' });
                } else next();
            })
            // Handling 500 Errors
            .use((error, request, response, next) => {
                console.log(`🐞 ${error.message} ${error.stack}\n`);
                console.log(`✉ [500 Internal Error] with PAYLOAD [${JSON.stringify({ success: !1, status: 'error', result: 'Oops Something broke out!' })}]`);
                response
                    .status(500)
                    .send({ success: !1, status: 'error', result: 'Oops Something broke out!' });
            })
        return this;
    }

    /**
    * @description Listen to the HTTP server requests
    * @memberof Server
    * @returns {Server}
    */
    #listenHttp() {
        this.activeServer = this.server
            .listen(this.PORT, () => {
                console.log(`👂 Connection Established, Serving HTTP with URL [http://localhost:${this.PORT}]\n`);
                console.log(`👂 Listening on PORT ${this.PORT}, URL:http://localhost:${this.PORT}`)
            })
        return this;
    }

    /**
     * @description Documents the Swagger API
     * @memberof Server
     * @returns {Server} 
     */
    #swaggerHttp() {
        if (this.isDevelopmentMode) {
            const swagger = Packages.Swagger
            this.server
                .use('/docs/', swagger.swaggerUI.serve,
                    swagger.
                        swaggerUI.
                        setup(
                            swagger
                                .swaggerJsDoc(Configurations.Swagger),
                            {
                                swaggerOptions: {
                                    docExpansion: 'list',
                                    filter: true,
                                    showRequestDuration: true,
                                },
                                customCss: '.swagger-ui .topbar { display: none }',
                                customSiteTitle: 'Swagger || Auth Server',
                            }))
            console.log(`📚 Swagger Documentation is available at http://localhost:${this.PORT}/docs/`);
            console.warn(`📚 Swagger Documentation is available at http://localhost:${this.PORT}/docs/`);
        }
        return this;
    }

    /**
     * @description Listens to Server Kill Signals
     * @memberof Server
     * @returns {Server}
     */
    #listenServerKill() {
        const { Utils } = Packages;
        process
            .on('SIGINT', (e) => {
                console.log(`💻 Received kill signal, shutting down gracefully.\n`);
                this.activeServer.close();
                console.log(`🔥 Server shutdown complete.`);
                process.exit();
            })
            .on('SIGTERM', () => {
                console.log(`💻 Received kill signal, shutting down gracefully.\n`);
                this.activeServer.close();
                console.log(`🔥 Server shutdown complete.`);
                process.exit();
            })
            .on('SIGHUP', () => {
                console.log(`💻 Received kill signal, shutting down gracefully.\n`);
                this.activeServer.close();
                console.log(`🔥 Server shutdown complete.`);
                process.exit();
            })
            ;
        return this;
    }

    /**
     * @description Instantiates the server
     * @constructor
     * @memberof Server
     */
    constructor() {
        const { Express } = Packages;

        // Setting Express
        this.server = Express();
        this
            // Defining Environment Variables
            .#defineServerVariables()
            ;
    }

    /**
     * @description Setups the HTTP Server
     * @memberof Server
     * @returns {Server}
     */
    setupHTTP() {
        console.log(`🌎 Setting up HTTP Server`);
        this
            // Activate HTTP Configurations
            .#activateHttp()
        // Log All the Incoming requests
        this
            // Handle Swagger
            .#swaggerHttp()
            // Handel Http Web, API and Socket Routes
            .#handleHttpRoutes()
            // Handel 404 
            .#handelHttpError()
            // Listen to HTTP Requests
            .#listenHttp()
            // Listen to Server Kill Signals
            .#listenServerKill()
            ;
        return this;
    }

    /**
     * @description Sets the server to listen on HTTP
     * @memberof Server
     * @returns {Server}
     */
    setUpServer() {
        // HTTP Setup
        return this.setupHTTP();
    }

}
// Exporting Module
module.exports = Server;

/** 
 * Error: listen EADDRINUSE: address already in use :::8080
 * https://www.murarinayak.com/blog/technology/how-to-resolve-eaddrinuse-address-already-in-use-error/
 */