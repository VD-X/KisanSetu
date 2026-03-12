const admin = require('../config/firebaseAdmin');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

const verifyJWT = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // Expect "Bearer <token>"

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    try {
        let decodedToken;
        let isFirebase = false;

        // Try standard JWT first
        try {
            decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        } catch (jwtError) {
            // If it fails, try Firebase
            try {
                decodedToken = await admin.auth().verifyIdToken(token);
                isFirebase = true;
            } catch (firebaseError) {
                console.error('Token verification failed (both JWT and Firebase):', firebaseError.message);
                return res.status(401).json({ message: 'Unauthorized: Invalid or expired token' });
            }
        }

        // Find user based on token type
        let user;
        const userInclude = {
            farmerProfile: true,
            buyerProfile: true,
            transporterProfile: true
        };

        if (isFirebase) {
            const orConditions = [
                { firebaseUid: decodedToken.uid },
                { email: decodedToken.email }
            ];
            if (/^[0-9a-fA-F]{24}$/.test(decodedToken.uid)) {
                orConditions.push({ id: decodedToken.uid });
            }
            user = await prisma.user.findFirst({
                where: { OR: orConditions },
                include: userInclude
            });
        } else {
            if (decodedToken.id && /^[0-9a-fA-F]{24}$/.test(decodedToken.id)) {
                if (decodedToken.id && /^[0-9a-fA-F]{24}$/.test(decodedToken.id)) {
                user = await prisma.user.findUnique({
                    where: { id: decodedToken.id },
                    include: userInclude
                });
            }
            } else {
                return res.status(401).json({ message: 'Unauthorized: Invalid user ID format' });
            }
        }

        if (!user) {
            return res.status(401).json({ message: 'Unauthorized: User profile not found in database' });
        }

        req.user = {
            id: user.id,
            uid: isFirebase ? decodedToken.uid : null,
            email: user.email,
            role: user.role
        };
        
        // Attach full database user object to request for controller consistency
        req.dbUser = user;

        next();
    } catch (error) {
        console.error('Auth verification error:', error.message);
        return res.status(500).json({ message: 'Internal server error during authentication' });
    }
};

const verifyFirebaseToken = async (req, res, next) => {
    // Keeping this for compatibility or specific needs, but it's redundant with updated verifyJWT
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.firebaseUser = decodedToken;
        next();
    } catch (error) {
        console.error('Firebase token verification error:', error);
        res.status(401).json({ message: 'Invalid Firebase token' });
    }
};

const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
        }
        next();
    };
};

// Optional JWT: Parses user if token exists, but allows request to continue if no token or invalid token
const optionalJWT = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // Expect "Bearer <token>"

    if (!token) {
        return next(); // Proceed without req.user
    }

    try {
        let decodedToken;
        let isFirebase = false;

        // Try standard JWT first
        try {
            decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        } catch (jwtError) {
            // If it fails, try Firebase
            try {
                decodedToken = await admin.auth().verifyIdToken(token);
                isFirebase = true;
            } catch (firebaseError) {
                return next(); // Token invalid, proceed as guest
            }
        }

        // Find user based on token type
        let user;
        const userInclude = {
            farmerProfile: true,
            buyerProfile: true,
            transporterProfile: true
        };

        if (isFirebase) {
            const orConditions = [
                { firebaseUid: decodedToken.uid },
                { email: decodedToken.email }
            ];
            if (/^[0-9a-fA-F]{24}$/.test(decodedToken.uid)) {
                orConditions.push({ id: decodedToken.uid });
            }
            user = await prisma.user.findFirst({
                where: { OR: orConditions },
                include: userInclude
            });
        } else {
            user = await prisma.user.findUnique({
                where: { id: decodedToken.id },
                include: userInclude
            });
        }

        if (user) {
            req.user = {
                id: user.id,
                uid: isFirebase ? decodedToken.uid : null,
                email: user.email,
                role: user.role
            };
            req.dbUser = user;
        }
    } catch (error) {
        console.error('Optional auth verification error:', error.message);
    }
    next();
};

module.exports = { verifyJWT, verifyFirebaseToken, requireRole, optionalJWT };
