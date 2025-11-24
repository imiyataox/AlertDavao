const db = require("./db");

// In-memory OTP storage (for development - use Redis in production)
const otpStorage = new Map();

// OTP configuration
const OTP_EXPIRY_TIME = 10 * 60 * 1000; // 10 minutes
const OTP_LENGTH = 6;

/**
 * Generate a random OTP code
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP via SMS (Twilio)
 * For development, you can also log to console instead of sending SMS
 */
const sendOTP = async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ message: "Phone number is required" });
  }

  try {
    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + OTP_EXPIRY_TIME;

    // Store OTP with phone number
    otpStorage.set(phoneNumber, {
      code: otp,
      expiresAt,
      attempts: 0
    });

    console.log(`📱 OTP for ${phoneNumber}: ${otp}`); // For development

    // Send SMS using Twilio (uncomment in production with real credentials)
    /*
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    
    const client = require('twilio')(accountSid, authToken);
    
    await client.messages.create({
      body: `Your AlertDavao verification code is: ${otp}. Valid for 10 minutes.`,
      from: twilioPhone,
      to: phoneNumber
    });
    */

    res.status(200).json({
      message: "OTP sent successfully",
      // For development only - remove in production
      devOTP: process.env.NODE_ENV === 'development' ? otp : undefined
    });
  } catch (err) {
    console.error("❌ Error sending OTP:", err);
    res.status(500).json({
      message: "Error sending OTP",
      error: err.message
    });
  }
};

/**
 * Verify OTP code
 */
const verifyOTP = async (req, res) => {
  const { phoneNumber, otp } = req.body;

  if (!phoneNumber || !otp) {
    return res.status(400).json({ message: "Phone number and OTP are required" });
  }

  try {
    const storedOTP = otpStorage.get(phoneNumber);

    if (!storedOTP) {
      return res.status(400).json({ message: "No OTP found for this phone number" });
    }

    // Check if OTP has expired
    if (Date.now() > storedOTP.expiresAt) {
      otpStorage.delete(phoneNumber);
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    // Check if too many attempts
    if (storedOTP.attempts >= 3) {
      otpStorage.delete(phoneNumber);
      return res.status(400).json({ message: "Too many incorrect attempts. Please request a new OTP." });
    }

    // Verify OTP
    if (storedOTP.code !== otp) {
      storedOTP.attempts += 1;
      otpStorage.set(phoneNumber, storedOTP);
      return res.status(400).json({
        message: `Incorrect OTP. ${3 - storedOTP.attempts} attempts remaining.`
      });
    }

    // OTP is correct - remove it from storage
    otpStorage.delete(phoneNumber);

    res.status(200).json({
      message: "OTP verified successfully",
      verified: true
    });
  } catch (err) {
    console.error("❌ Error verifying OTP:", err);
    res.status(500).json({
      message: "Error verifying OTP",
      error: err.message
    });
  }
};

/**
 * Send OTP for login verification
 */
const sendLoginOTP = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    // Get user's phone number from database
    const [users] = await db.query(
      "SELECT contact FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0 || !users[0].contact) {
      return res.status(404).json({ message: "User not found or no phone number registered" });
    }

    const phoneNumber = users[0].contact;
    
    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + OTP_EXPIRY_TIME;

    // Store OTP with email as key for login
    otpStorage.set(`login:${email}`, {
      code: otp,
      expiresAt,
      attempts: 0
    });

    console.log(`📱 Login OTP for ${email} (${phoneNumber}): ${otp}`); // For development

    // Send SMS using Twilio (uncomment in production)
    /*
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    
    const client = require('twilio')(accountSid, authToken);
    
    await client.messages.create({
      body: `Your AlertDavao login verification code is: ${otp}. Valid for 10 minutes.`,
      from: twilioPhone,
      to: phoneNumber
    });
    */

    res.status(200).json({
      message: "Login OTP sent successfully",
      phoneNumber: phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'), // Mask middle digits
      // For development only
      devOTP: process.env.NODE_ENV === 'development' ? otp : undefined
    });
  } catch (err) {
    console.error("❌ Error sending login OTP:", err);
    res.status(500).json({
      message: "Error sending login OTP",
      error: err.message
    });
  }
};

/**
 * Verify login OTP
 */
const verifyLoginOTP = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  try {
    const storedOTP = otpStorage.get(`login:${email}`);

    if (!storedOTP) {
      return res.status(400).json({ message: "No OTP found. Please request a new one." });
    }

    // Check if OTP has expired
    if (Date.now() > storedOTP.expiresAt) {
      otpStorage.delete(`login:${email}`);
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    // Check if too many attempts
    if (storedOTP.attempts >= 3) {
      otpStorage.delete(`login:${email}`);
      return res.status(400).json({ message: "Too many incorrect attempts. Please request a new OTP." });
    }

    // Verify OTP
    if (storedOTP.code !== otp) {
      storedOTP.attempts += 1;
      otpStorage.set(`login:${email}`, storedOTP);
      return res.status(400).json({
        message: `Incorrect OTP. ${3 - storedOTP.attempts} attempts remaining.`
      });
    }

    // OTP is correct - remove it from storage
    otpStorage.delete(`login:${email}`);

    res.status(200).json({
      message: "Login OTP verified successfully",
      verified: true
    });
  } catch (err) {
    console.error("❌ Error verifying login OTP:", err);
    res.status(500).json({
      message: "Error verifying login OTP",
      error: err.message
    });
  }
};

module.exports = {
  sendOTP,
  verifyOTP,
  sendLoginOTP,
  verifyLoginOTP
};
