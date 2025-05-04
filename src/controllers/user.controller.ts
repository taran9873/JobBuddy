import { Request, Response } from 'express';
import User from '../models/user.model';
import { JwtService } from '../services/jwt.service';

export class UserController {
  static async register(req: Request, res: Response) {
    try {
      const { email, password, name } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      // Create new user
      const user = new User({
        email,
        password,
        name
      });

      await user.save();

      // Generate tokens
      const tokens = JwtService.generateTokens(user);

      // Update user with refresh token
      user.refreshToken = tokens.refreshToken;
      await user.save();

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user._id,
          email: user.email,
          name: user.name
        },
        tokens
      });
    } catch (error) {
      res.status(500).json({ message: 'Error registering user', error });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Verify password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate tokens
      const tokens = JwtService.generateTokens(user);

      // Update user with refresh token and last login
      user.refreshToken = tokens.refreshToken;
      user.lastLogin = Date.now();
      await user.save();

      res.json({
        message: 'Login successful',
        user: {
          id: user._id,
          email: user.email,
          name: user.name
        },
        tokens
      });
    } catch (error) {
      res.status(500).json({ message: 'Error logging in', error });
    }
  }

  static async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token is required' });
      }

      // Verify refresh token
      const payload = JwtService.verifyRefreshToken(refreshToken);

      // Find user
      const user = await User.findById(payload.userId);
      if (!user || user.refreshToken !== refreshToken) {
        return res.status(401).json({ message: 'Invalid refresh token' });
      }

      // Generate new tokens
      const tokens = JwtService.generateTokens(user);

      // Update user with new refresh token
      user.refreshToken = tokens.refreshToken;
      await user.save();

      res.json({ tokens });
    } catch (error) {
      res.status(401).json({ message: 'Invalid refresh token' });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      const user = req.user;
      if (user) {
        user.refreshToken = undefined;
        await user.save();
      }
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error logging out', error });
    }
  }

  static async getProfile(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      res.json({
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching profile', error });
    }
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { name, email } = req.body;

      // Check if email is being changed and if it's already taken
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return res.status(400).json({ message: 'Email already registered' });
        }
        user.email = email;
      }

      if (name) {
        user.name = name;
      }

      await user.save();

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          email: user.email,
          name: user.name
        }
      });
    } catch (error) {
      res.status(500).json({ message: 'Error updating profile', error });
    }
  }

  static async changePassword(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { currentPassword, newPassword } = req.body;

      // Verify current password
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Generate new tokens
      const tokens = JwtService.generateTokens(user);

      res.json({
        message: 'Password changed successfully',
        tokens
      });
    } catch (error) {
      res.status(500).json({ message: 'Error changing password', error });
    }
  }

  static async deleteAccount(req: Request, res: Response) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Delete user
      await user.deleteOne();

      res.json({ message: 'Account deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting account', error });
    }
  }
} 