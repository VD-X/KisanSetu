const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const vehicleService = require('../services/vehicleService');

const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, role: user.role, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

const mapProfile = (user, profile) => {
    const langMap = {
        'ENGLISH': 'en',
        'HINDI': 'hi',
        'TELUGU': 'te',
        'TAMIL': 'ta',
        'KANNADA': 'kn'
    };

    const base = {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        profilePhoto: user.profilePhoto,
        language: langMap[profile?.language] || 'en',
        fullProfile: profile, // Include the raw profile object for frontend access
    };

    if (user.role === 'FARMER' && profile) {
        return {
            ...base,
            name: profile.fullName,
            phone: profile.phone,
            location: {
                village: profile.village,
                district: profile.district,
                state: profile.state,
                address: profile.address,
                latitude: profile.latitude,
                longitude: profile.longitude,
            }
        };
    } else if (user.role === 'BUYER' && profile) {
        return {
            ...base,
            name: profile.fullName,
            phone: profile.phone,
            location: {
                village: '',
                district: profile.city,
                state: profile.state,
                address: profile.address,
                latitude: profile.latitude,
                longitude: profile.longitude,
            }
        };
    } else if (user.role === 'TRANSPORTER' && profile) {
        return {
            ...base,
            name: profile.fullName,
            phone: profile.phone,
            location: {
                address: profile.address,
                city: profile.city,
                state: profile.state,
                pincode: profile.pincode,
            },
            fleet: {
                vehicleType: profile.vehicleType,
                vehicleNumber: profile.vehicleNumber,
                capacity: profile.capacity,
                pricePerKm: profile.pricePerKm,
            },
            transporterProfile: profile // Explicitly include for frontend convenience
        };
    }

    return {
        ...base,
        name: user.name || (user.role === 'ADMIN' ? 'Administrator' : 'User'),
        phone: user.phone || '',
    };
};

// Signup Controller
const signup = async (req, res) => {
    console.log('Signup Request Body:', req.body);
    const { role, email, password, profileData } = req.body;

    if (!role || !email || !password || !profileData) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        let initialStatus = 'ACTIVE';

        const { user, profile } = await prisma.$transaction(async (prisma) => {
            const user = await prisma.user.create({
                data: { email, password: hashedPassword, role, status: initialStatus },
            });

            let profile = null;
            if (role === 'FARMER') {
                profile = await prisma.farmerProfile.create({
                    data: {
                        userId: user.id,
                        fullName: profileData.fullName || 'Farmer',
                        phone: profileData.phone || '',
                        gender: profileData.gender || 'Not Specified',
                        landSize: parseFloat(profileData.landSize) || 0,
                        village: profileData.village || '',
                        district: profileData.district || '',
                        state: profileData.state || ''
                    },
                });
            } else if (role === 'BUYER') {
                profile = await prisma.buyerProfile.create({
                    data: {
                        userId: user.id,
                        fullName: profileData.fullName || 'Buyer',
                        phone: profileData.phone || '',
                        gender: profileData.gender || 'Not Specified',
                        city: profileData.city || '',
                        state: profileData.state || ''
                    },
                });
            } else if (role === 'TRANSPORTER') {
                profile = await prisma.transporterProfile.create({
                    data: {
                        userId: user.id,
                        approvalStatus: 'PENDING',
                        fullName: profileData.fullName || 'Transporter',
                        phone: profileData.phone || '',
                        gender: profileData.gender || 'Not Specified',
                        vehicleType: profileData.vehicleType || 'MINI_TRUCK',
                        vehicleNumber: profileData.vehicleNumber || 'PENDING',
                        capacity: parseFloat(profileData.capacity) || 0,
                        pricePerKm: parseFloat(profileData.pricePerKm) || 0
                    },
                });
            }

            return { user, profile };
        });

        const token = generateToken(user);
        res.status(201).json({
            message: 'Signup successful',
            token,
            user: mapProfile(user, profile),
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// Login Controller
const login = async (req, res) => {
    console.log('Login Request Body:', req.body);
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                farmerProfile: true,
                buyerProfile: true,
                transporterProfile: true,
            }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        if (user.role !== role) {
            // Log it but let the user know specifically
            console.log(`Role mismatch: DB has ${user.role}, login tried ${role}`);
            return res.status(403).json({
                message: `Access denied. This account is registered as ${user.role}. Please select the ${user.role} option at login.`
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const profile = user.farmerProfile || user.buyerProfile || user.transporterProfile || null;
        const token = generateToken(user);

        res.status(200).json({
            message: 'Login successful',
            token,
            user: mapProfile(user, profile),
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// Get Current User (Me)
const getMe = async (req, res) => {
    try {
        const userId = req.dbUser.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                farmerProfile: true,
                buyerProfile: true,
                transporterProfile: true,
            },
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const profile = user.farmerProfile || user.buyerProfile || user.transporterProfile || null;
        res.json(mapProfile(user, profile));
    } catch (error) {
        console.error('getMe error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Update Profile
const updateProfile = async (req, res) => {
    try {
        const userId = req.dbUser.id;
        const role = req.dbUser.role;
        const updates = req.body;

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(updates.profilePhoto !== undefined && { profilePhoto: updates.profilePhoto }), // Update profile photo if provided (allow null/empty)
            },
            include: {
                farmerProfile: true,
                buyerProfile: true,
                transporterProfile: true,
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        let updatedProfile = null;

        if (role === 'FARMER') {
            updatedProfile = await prisma.farmerProfile.update({
                where: { userId },
                data: {
                    fullName: updates.name,
                    phone: updates.phone,
                    village: updates.location?.village,
                    district: updates.location?.district,
                    state: updates.location?.state,
                    address: updates.location?.address,
                    latitude: updates.location?.latitude,
                    longitude: updates.location?.longitude,
                }
            });
        } else if (role === 'BUYER') {
            updatedProfile = await prisma.buyerProfile.update({
                where: { userId },
                data: {
                    fullName: updates.name,
                    phone: updates.phone,
                    city: updates.location?.district, // Mapping district to city for buyer
                    state: updates.location?.state,
                    address: updates.location?.address,
                    latitude: updates.location?.latitude,
                    longitude: updates.location?.longitude,
                }
            });
        } else if (role === 'TRANSPORTER') {
            const dataToUpdate = {
                fullName: updates.name,
                phone: updates.phone,
                address: updates.location?.address,
                city: updates.location?.city,
                state: updates.location?.state,
                pincode: updates.location?.pincode,
                latitude: updates.location?.latitude,
                longitude: updates.location?.longitude,
            };

            // Fleet/Vehicle details update
            if (updates.fleet) {
                if (updates.fleet.vehicleType) {
                    dataToUpdate.vehicleType = vehicleService.normalizeVehicleType(updates.fleet.vehicleType);
                }
                if (updates.fleet.vehicleNumber) dataToUpdate.vehicleNumber = updates.fleet.vehicleNumber;
                if (updates.fleet.capacity !== undefined) dataToUpdate.capacity = parseFloat(updates.fleet.capacity);
                if (updates.fleet.pricePerKm !== undefined) dataToUpdate.pricePerKm = parseFloat(updates.fleet.pricePerKm);
            }

            // Handle serviceRange update if present
            if (updates.serviceRange !== undefined) {
                dataToUpdate.serviceRange = parseFloat(updates.serviceRange);
            }

            updatedProfile = await prisma.transporterProfile.update({
                where: { userId },
                data: dataToUpdate
            });
        }

        const fullUser = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                farmerProfile: true,
                buyerProfile: true,
                transporterProfile: true,
            }
        });

        const profile = fullUser.farmerProfile || fullUser.buyerProfile || fullUser.transporterProfile;

        res.json({
            message: 'Profile updated successfully',
            user: mapProfile(fullUser, profile)
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

const admin = require('../config/firebaseAdmin');

// ... (previous functions mapping profiles)

// Firebase Login Controller
const firebaseLogin = async (req, res) => {
    const { idToken, role, email: providedEmail, name, photo, profileData } = req.body;

    if (!idToken || !role) {
        return res.status(400).json({ message: 'idToken and role are required' });
    }

    if (!admin.isReady()) {
        console.error('Firebase Login failed: Firebase Admin is not initialized');
        return res.status(503).json({ 
            message: 'Authentication service (Firebase) is currently unavailable. Please check backend configuration.',
            error: admin.getError()
        });
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const { uid, email: firebaseEmail, phone_number } = decodedToken;
        const email = firebaseEmail || providedEmail;

        // 1. Try to find user by firebaseUid
        let user = await prisma.user.findUnique({
            where: { firebaseUid: uid },
            include: { farmerProfile: true, buyerProfile: true, transporterProfile: true }
        });

        // 2. If not found by firebaseUid, try by email
        if (!user && email) {
            user = await prisma.user.findUnique({
                where: { email },
                include: { farmerProfile: true, buyerProfile: true, transporterProfile: true }
            });

            // Link firebaseUid to existing user
            if (user) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { firebaseUid: uid },
                    include: { farmerProfile: true, buyerProfile: true, transporterProfile: true }
                });
            }
        }

        // 3. If still not found, create new user (Signup case)
        if (!user) {
            user = await prisma.$transaction(async (tx) => {
                const newUser = await tx.user.create({
                    data: {
                        email: email || null,
                        firebaseUid: uid,
                        role,
                        status: 'ACTIVE',
                        profilePhoto: photo || null
                    }
                });

                // Create profile based on role using provided profileData or defaults
                const baseProfile = {
                    userId: newUser.id,
                    fullName: profileData?.fullName || name || email || 'User',
                    phone: profileData?.phone || phone_number || ''
                };

                if (role === 'FARMER') {
                    await tx.farmerProfile.create({
                        data: {
                            ...baseProfile,
                            gender: profileData?.gender || '',
                            landSize: parseFloat(profileData?.landSize) || 0,
                            village: profileData?.village || '',
                            district: profileData?.district || '',
                            state: profileData?.state || '',
                            address: profileData?.address || '',
                            longitude: profileData?.longitude || null,
                            latitude: profileData?.latitude || null,
                        }
                    });
                } else if (role === 'BUYER') {
                    await tx.buyerProfile.create({
                        data: {
                            ...baseProfile,
                            gender: profileData?.gender || '',
                            city: profileData?.city || '',
                            state: profileData?.state || '',
                            address: profileData?.address || '',
                        }
                    });
                } else if (role === 'TRANSPORTER') {
                    await tx.transporterProfile.create({
                        data: {
                            ...baseProfile,
                            gender: profileData?.gender || '',
                            vehicleType: profileData?.vehicleType || 'MINI_TRUCK',
                            vehicleNumber: profileData?.vehicleNumber || '',
                            capacity: parseFloat(profileData?.capacity) || 0,
                            pricePerKm: parseFloat(profileData?.pricePerKm) || 0
                        }
                    });
                }

                return await tx.user.findUnique({
                    where: { id: newUser.id },
                    include: { farmerProfile: true, buyerProfile: true, transporterProfile: true }
                });
            });
        }

        // Ensure roles match if user existed
        if (user.role !== role) {
            return res.status(403).json({ message: `Access denied. This account is registered as ${user.role}.` });
        }

        const profile = user.farmerProfile || user.buyerProfile || user.transporterProfile || null;
        const token = generateToken(user);

        res.status(200).json({
            message: 'Firebase login successful',
            token,
            user: mapProfile(user, profile),
        });
    } catch (error) {
        console.error('Firebase Login error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

const otplessLogin = async (req, res) => {
    const { token, role } = req.body;

    if (!token || !role) {
        return res.status(400).json({ message: 'Token and role are required' });
    }

    try {
        // In production, verify the token with OTPless API: https://otpless.com/v3/verify
        // For now, we simulate the verify & extract logic.
        // OTPless tokens contain user info on successful client-side validation.

        // This is a placeholder. You should add OTPLESS_CLIENT_ID and OTPLESS_CLIENT_SECRET to .env
        // const response = await axios.post('https://otpless.com/v3/verify', { token, client_id, client_secret });
        // const { phoneNumber, email, name } = response.data;

        // Mocking user profile for local preview
        const mockPhone = "919876543210"; // In reality, get this from verification

        let user = await prisma.user.findFirst({
            where: {
                OR: [
                    { phoneNumber: mockPhone },
                    { email: `${mockPhone}@whatsapp.com` }
                ]
            }
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    phoneNumber: mockPhone,
                    email: `${mockPhone}@whatsapp.com`,
                    role: role,
                    isVerified: true
                }
            });
        }

        const sessionToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'WhatsApp login successful',
            token: sessionToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                name: user.name || 'WhatsApp User'
            }
        });
    } catch (error) {
        console.error('OTPless login error:', error);
        res.status(500).json({ message: 'WhatsApp authentication failed', error: error.message });
    }
};

// Admin Login Controller (dedicated secure endpoint)
const adminLogin = async (req, res) => {
    const { email, password, adminSecret } = req.body;

    if (!email || !password || !adminSecret) {
        return res.status(400).json({ message: 'Email, password, and admin secret key are required' });
    }

    // Validate the admin secret key against the environment variable
    if (adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ message: 'Invalid admin credentials' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Access denied. This account does not have admin privileges.' });
        }

        if (!user.password) {
            return res.status(400).json({ message: 'This admin account uses social login. Please use the standard login page.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = generateToken(user);

        res.status(200).json({
            message: 'Admin login successful',
            token,
            user: mapProfile(user, null),
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

module.exports = { signup, login, getMe, updateProfile, firebaseLogin, otplessLogin, adminLogin };
