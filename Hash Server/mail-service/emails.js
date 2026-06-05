import {
    PASSWORD_RESET_REQUEST_TEMPLATE,
    PASSWORD_RESET_SUCCESS_TEMPLATE,
    VERIFICATION_EMAIL_TEMPLATE
} from './emailTemplates.js';

import { nodeMailSender, sender } from './nodemail.config.js';

export const sendVerificationEmail = async (email, verificationToken) => {
    if (process.env.USE_GMAIL_SERVICE !== 'true') {
        console.log(`\n========================================`);
        console.log(`[MOCK EMAIL] Verification email to: ${email}`);
        console.log(`Code: ${verificationToken}`);
        console.log(`========================================\n`);
        return;
    }

    try{
        const response = await nodeMailSender.sendMail({
            from: `${sender.name} <${process.env.GMAIL}>`,
            to: email,
            subject: "Email Verification",
            html: VERIFICATION_EMAIL_TEMPLATE.replace("{verificationCode}", verificationToken),

        });
        console.log("Email sent successfully", response);
    }catch(error){
        console.error(`Error sending verification email`, error);
        throw new Error(`Error sending verification email: ${error}`);
    }
}

/*export const sendWelcomeEmail = async (email, name) => {
    const recipient = [{ email }];

    try{
        const response = await nodeMailSender.sendMail({
            from: `${sender.name} <${process.env.GMAIL_USER}>`,
            to: recipient,
            template_uuid: "e65925d1-a9d1-4a40-ae7c-d92b37d593df",
			template_variables: {
				company_info_name: "Auth Company",
				name: name,
			},
        });
        console.log("Welcome email sent successfully", response);
    }catch(error){
        console.error(`Error sending welcome email`, error);
        throw new Error(`Error sending welcome email: ${error}`);
    }
}
*/

export const sendPasswordResetEmail = async (email, resetURL) => {
    if (process.env.USE_GMAIL_SERVICE !== 'true') {
        console.log(`\n========================================`);
        console.log(`[MOCK EMAIL] Password Reset email to: ${email}`);
        console.log(`URL: ${resetURL}`);
        console.log(`========================================\n`);
        return;
    }

    try{
        const response = await nodeMailSender.sendMail({
            from: `${sender.name} <${process.env.GMAIL}>`,
            to: email,
            subject: "Reset your password",
			html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetURL),

        });
        console.log("Password reset email sent successfully", response);
    }catch(error){
        console.error(`Error sending password reset email`, error);
        throw new Error(`Error sending password reset email: ${error}`);
    }
}

export const sendResetSuccessEmail = async (email) => {
    if (process.env.USE_GMAIL_SERVICE !== 'true') {
        console.log(`\n========================================`);
        console.log(`[MOCK EMAIL] Password reset success email to: ${email}`);
        console.log(`========================================\n`);
        return;
    }

    try{
        const response = await nodeMailSender.sendMail({
            from: `${sender.name} <${process.env.GMAIL}>`,
            to: email,
			subject: "Password Reset Successful",
			html: PASSWORD_RESET_SUCCESS_TEMPLATE,

        });
        console.log("Password reset success email sent successfully", response);
    }catch(error){
        console.error(`Error sending password reset success email`, error);
        throw new Error(`Error sending password reset success email: ${error}`);
    }
}