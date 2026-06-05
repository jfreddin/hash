import User from '../models/User.js';

import bcrypt from 'bcryptjs';
import { generateTokenAndSetCookie } from '../utils/generateTokenAndSetCookie.js';
import { sendPasswordResetEmail, sendResetSuccessEmail, sendVerificationEmail } from '../mail-service/emails.js';
import crypto from "crypto";
const saltRounds = 10;

export async function checkAuth(req, res){
    try{
        const user = await User.findById(req.userId);
        if(!user){
            return res.status(400).json({success: false, message: "User not found"});
        }

        res.status(200).json({success: true, user: {
            ...user._doc,
            password: undefined
        }});

    }catch(error){
        console.log("Error in checkAuth ", error);
        res.status(500).json({success: false, message: "Internal server error"})
    }
}

export async function signup(req, res){
    const{username, name, email, password}  = req.body;
    try{
        
        if(!email || !password || !name){
            return res.status(400).json({ message: "All fields are required"});
        }

        const emailAlreadyExists = await User.findOne({email});
        const userAlreadyExists = await User.findOne({username});

        if(userAlreadyExists ){
            return res.status(400).json({ success:false, message: "Username already exists"});
        }
        if(emailAlreadyExists){
            return res.status(400).json({ success:false, message:"Email already exists" })
        };

        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const verificationToken = Math.floor (100000 + Math.random() * 900000).toString();

        const user = new User({
            username,
            name,
            email,
            password: hashedPassword,
            verificationToken,
            verificationTokenExpiresAt: Date.now() + 24*60*60*1000 //24 hours
        })

        const savedUser = await user.save();
        generateTokenAndSetCookie(res, user._id);

        await sendVerificationEmail(user.email, verificationToken);

        res.status(201).json({
            success: true,
            message: "User created successfully",
            user: {
                ...user._doc,
                password: undefined,
            }
        });
        console.log("User created");
    }catch(error){
        console.error(`Error creating user in createUser controller: ${error}`);
        res.status(504).json({ message: "Error in creating user"});
    }
}

export async function login(req, res){
    const { email, password } = req.body;
    try{
        // Accept either email address or username in the "email" field
        const user = await User.findOne({
            $or: [
                { email: email },
                { username: email }
            ]
        });
        if(!user){
            return res.status(400).json({
                success: false,
                message: "Invalid credentials"
            })
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if(!isPasswordValid){
            return res.status(400).json({
                success: false,
                message: "Invalid credentials"
            })
        }

        generateTokenAndSetCookie(res, user._id);
        user.lastLogin = new Date();
        await user.save();

        res.status(200).json({
            success: true,
            message: "Logged in successfully",
            user: {
                ...user._doc,
                password: undefined,
            }
        })
    }catch(error){
        console.error("Error in login controller", error);
        res.status(504).json({ success: false, message: "Internal server error"});
    }
}

export async function logout(req, res){
    try{
        // Must pass same options as when cookie was set — browser ignores mismatched clearCookie
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        });
        res.status(200).json({ success: true, message: "Logged out successfully" });

    }catch(error){
        console.error("Error in logout controller");
        res.status(504).json({ success: false, message: "Internal server error" });
    }
}

export async function verifyEmail(req, res){
    const { code } = req.body;
    try{
        const user = await User.findOne({
            verificationToken: code,
            verificationTokenExpiresAt: { $gt: Date.now() }
        });

        if(!user){
            return res.status(400).json({
                success: false,
                message: "Invalid or expired verification code"
            })
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpiresAt = undefined;
        await user.save();
        return res.status(200).json({
            success: true,
            message: "Email verified successfully",
            user : {
                ...user._doc,
                password: undefined,
            }
        })
    }catch(error){
        return res.status(400).json({
            success: false,
            message: "Bad request"
        })
    }
}

export async function forgotPassword(req, res){
     const { email } = req.body;
    try{
       const user = await User.findOne({ email });
       if(!user){
        return res.status(400).json({
            success: false,
            message: "Invalid credentials, email doesn't exist"
        })
       }
       
       const resetToken = crypto.randomBytes(20).toString("hex");
       const resetTokenExpiresAt = Date.now() + 60*60*1000;

       await sendPasswordResetEmail(email, `${process.env.CLIENT_URL}/reset-password/${resetToken}`);

       user.resetPasswordToken = resetToken;
       user.resetPasswordExpiresAt = resetTokenExpiresAt;
       await user.save();

       res.status(200).json({
        success: true,
        messaage: "Password reset link sent to your email"
       });
    }catch(error){
        console.log("Error in forgotPassword controller");
        res.status(400).json({ success: false, message: error.messaage});
    }
}

export async function resetPassword(req, res){
        const {token} = req.params;
        const {password} = req.body;    
    try{
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpiresAt: { $gt: Date.now() },
        })
        if(!user){
            return res.status(400).json({
                success: false,
                message: "Invalid link, user not found or token expired"
            })
        }
        
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        user.password = hashedPassword;
        user.resetPasswordExpiresAt = undefined;
        user.resetPasswordToken = undefined;
        await user.save();

        await sendResetSuccessEmail(user.email);

        res.status(200).json({ success: true, message: "Password reset successfully!"});
            
    }catch(error){
        console.log(`Error in resetPassword controller, ${error}`);
        res.status(400).json({ success: false, message: "Failed to reset password"})
    }
}



