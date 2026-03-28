import express from 'express';
import cors from 'cors';
import router from '@routes/routes';
import logger from '@utils/logger';
import prisma from './config/prisma';
import { PORT } from './config';
import './utils/globalSetup';
import { errorHandler } from './utils/error-handler';
import { swaggerSpec, swaggerUi } from './utils/swagger';

const appServer = express();
const port = PORT;

const corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200,
};

appServer.use((req, res, next) => {
    const startTime = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const message = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`;

        if (res.statusCode >= 500) {
            logger.error(message);
        } else if (res.statusCode >= 400) {
            logger.warn(message);
        } else {
            logger.info(message);
        }
    });

    next();
});

// Enable CORS
appServer.use(cors(corsOptions));
appServer.options('*', cors(corsOptions));

// Middleware for parsing JSON and URL-encoded bodies
appServer.use(express.json());
appServer.use(express.urlencoded({ extended: true }));

appServer.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

appServer.get('/health', async (req, res) => {
    try {
        // lightweight DB check
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({
            status: 'OK',
            message: 'Server and database are healthy',
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        res.status(500).json({
            status: 'ERROR',
            message: 'Database connection failed',
            error: err instanceof Error ? err.message : err,
            timestamp: new Date().toISOString(),
        });
    }
});

// Use the router with the /api prefix
appServer.use('/api', router);
appServer.use(errorHandler);

appServer.all('*', (req, res) => {
    res.status(404).json({ message: 'Sorry! Page not found' });
});

// Start the server after ensuring database connection
async function startServer() {
    try {
        await prisma.$connect();
        console.log('✅ Connected to PostgreSQL database successfully');

        appServer.listen(port, () => {
            console.log(`🚀 Server running at http://localhost:${port}`);
        });
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    }
}

startServer();
