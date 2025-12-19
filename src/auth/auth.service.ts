import { Injectable, UnauthorizedException, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {
    // Validate JWT secrets are configured
    const jwtSecret = this.config.get<string>('JWT_SECRET');
    const jwtRefreshSecret = this.config.get<string>('JWT_REFRESH_SECRET');
    
    if (!jwtSecret) {
      this.logger.error('JWT_SECRET is not configured in environment variables');
      throw new Error('JWT_SECRET is required but not configured');
    }
    
    if (!jwtRefreshSecret) {
      this.logger.error('JWT_REFRESH_SECRET is not configured in environment variables');
      throw new Error('JWT_REFRESH_SECRET is required but not configured');
    }
    
    this.logger.log('JWT secrets validated successfully');
  }

  async register(registerDto: RegisterDto) {
    const { email, password, firstName, lastName, role, phone, metadata } = registerDto;

    // Normalize email to lowercase for consistency
    const normalizedEmail = email.toLowerCase().trim();

    this.logger.log(`Registration attempt for email: ${normalizedEmail}, role: ${role}`);

    try {
      // Check if user exists (case-insensitive using raw query for PostgreSQL)
      const existingUser = await this.prisma.$queryRaw`
        SELECT * FROM users WHERE LOWER(email) = LOWER(${normalizedEmail}) LIMIT 1
      ` as any;

      if (existingUser) {
        this.logger.warn(`Registration failed: User already exists - ${normalizedEmail}`);
        throw new UnauthorizedException('User with this email already exists');
      }

      // Hash password
      this.logger.debug('Hashing password...');
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user with normalized email
      this.logger.log(`Creating user: ${normalizedEmail}`);
      const user = await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          firstName,
          lastName,
          role,
          phone,
        },
      });

      this.logger.log(`User created successfully: ${user.id}`);

      // Create role-specific profile if metadata is provided
      if (metadata) {
        if (role === 'EXPORT_COMPANY' && metadata.companyName) {
          // Use companyRegistration from frontend or registrationNumber, or generate one
          const registrationNo = 
            (metadata as any).companyRegistration || 
            metadata.registrationNumber || 
            `REG-${Date.now()}-${user.id.slice(0, 6).toUpperCase()}`;
          
          try {
            await this.prisma.exportCompany.create({
              data: {
                userId: user.id,
                companyName: metadata.companyName,
                registrationNo: registrationNo,
                gepaLicense: null, // Can be updated later
              },
            });
            this.logger.log(`Export company profile created for user: ${user.id}`);
          } catch (error) {
            this.logger.error(`Failed to create export company profile: ${error.message}`);
            // Don't fail registration if profile creation fails, user can complete it later
          }
        } else if (role === 'BUYER' && ((metadata as any).organization || metadata.companyName)) {
          try {
            await this.prisma.buyer.create({
              data: {
                userId: user.id,
                companyName: (metadata as any).organization || metadata.companyName || `${firstName} ${lastName}`,
                country: metadata.country || 'GH',
                countryName: metadata.country || 'Ghana',
                industry: metadata.industry || 'Agriculture',
                seekingCrops: [],
                qualityStandards: [],
              },
            });
            this.logger.log(`Buyer profile created for user: ${user.id}`);
          } catch (error) {
            this.logger.error(`Failed to create buyer profile: ${error.message}`);
            // Don't fail registration if profile creation fails
          }
        }
        // Note: Other roles (TRADER, LOGISTICS_PROVIDER, CUSTOMS_BROKER, etc.) 
        // don't have specific profile tables yet, but metadata is stored in user record
        // and can be used to create profiles later when those models are added
        this.logger.debug(`Registration metadata stored for role: ${role}`);
      }

      // Generate tokens
      this.logger.debug('Generating tokens...');
      const tokens = await this.generateTokens(user.id, user.email, user.role);

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      this.logger.log(`Registration successful: ${normalizedEmail} (${user.id})`);

      return {
        user: userWithoutPassword,
        ...tokens,
      };
    } catch (error) {
      this.logger.error(`Registration error for ${normalizedEmail}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Normalize email to lowercase for case-insensitive lookup
    const normalizedEmail = email.toLowerCase().trim();

    this.logger.log(`Login attempt for email: ${normalizedEmail}`);

    try {
      // Find user - try exact match first (for new users with normalized emails)
      // Then try case-insensitive search for existing users with mixed-case emails
      let user = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      // If not found, try case-insensitive search using raw query for PostgreSQL
      if (!user) {
        user = await this.prisma.$queryRaw`
          SELECT * FROM users WHERE LOWER(email) = LOWER(${normalizedEmail}) LIMIT 1
        ` as any;
      }

      if (!user) {
        this.logger.warn(`Login failed: User not found - ${normalizedEmail}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      // Verify password
      this.logger.debug('Verifying password...');
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        this.logger.warn(`Login failed: Invalid password - ${email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      // Generate tokens
      this.logger.debug('Generating tokens...');
      const tokens = await this.generateTokens(user.id, user.email, user.role);

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      this.logger.log(`Login successful: ${email} (${user.id}), role: ${user.role}`);

      return {
        user: userWithoutPassword,
        ...tokens,
      };
    } catch (error) {
      this.logger.error(`Login error for ${normalizedEmail}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    this.logger.log(`Password change attempt for user: ${userId}`);

    try {
      // Find user
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        this.logger.warn(`Password change failed: User not found - ${userId}`);
        throw new NotFoundException('User not found');
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

      if (!isPasswordValid) {
        this.logger.warn(`Password change failed: Invalid current password - ${userId}`);
        throw new UnauthorizedException('Current password is incorrect');
      }

      // Check if new password is different
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        throw new BadRequestException('New password must be different from current password');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await this.prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      this.logger.log(`Password changed successfully for user: ${userId}`);
      return { message: 'Password changed successfully' };
    } catch (error) {
      this.logger.error(`Password change error for ${userId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async validateUser(userId: string) {
    this.logger.debug(`Validating user: ${userId}`);
    
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          verified: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        this.logger.warn(`User validation failed: User not found - ${userId}`);
      } else {
        this.logger.debug(`User validated: ${user.email} (${userId})`);
      }

      return user;
    } catch (error) {
      this.logger.error(`User validation error for ${userId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      this.logger.warn('Refresh token attempt: Token missing');
      throw new UnauthorizedException('Refresh token missing');
    }
    
    this.logger.debug('Refreshing token...');
    
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET');
    if (!refreshSecret) {
      this.logger.error('JWT_REFRESH_SECRET is not configured');
      throw new UnauthorizedException('Server configuration error: Refresh token secret not configured');
    }
    
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: refreshSecret,
      });
      
      this.logger.log(`Token refresh successful for user: ${payload.sub} (${payload.email})`);
      
      const tokens = await this.generateTokens(payload.sub, payload.email, payload.role);
      return tokens;
    } catch (error) {
      // Provide more specific error messages
      if (error.name === 'JsonWebTokenError') {
        if (error.message === 'invalid signature') {
          this.logger.error(`Token refresh failed: Invalid signature. This usually means the token was signed with a different secret or the secret has changed.`, error.stack);
          throw new UnauthorizedException('Invalid refresh token: Token signature mismatch. Please log in again.');
        } else if (error.message === 'jwt malformed') {
          this.logger.error(`Token refresh failed: Malformed token`, error.stack);
          throw new UnauthorizedException('Invalid refresh token: Token format is invalid. Please log in again.');
        } else {
          this.logger.error(`Token refresh failed: ${error.message}`, error.stack);
          throw new UnauthorizedException(`Invalid refresh token: ${error.message}. Please log in again.`);
        }
      } else if (error.name === 'TokenExpiredError') {
        this.logger.warn(`Token refresh failed: Token expired`);
        throw new UnauthorizedException('Refresh token has expired. Please log in again.');
      } else {
        this.logger.error(`Token refresh failed: ${error.message}`, error.stack);
        throw new UnauthorizedException('Invalid refresh token. Please log in again.');
      }
    }
  }

  private async generateTokens(userId: string, email: string, role: string) {
    this.logger.debug(`Generating tokens for user: ${userId} (${email})`);
    
    const jwtSecret = this.config.get<string>('JWT_SECRET');
    const jwtRefreshSecret = this.config.get<string>('JWT_REFRESH_SECRET');
    
    if (!jwtSecret) {
      this.logger.error('JWT_SECRET is not configured');
      throw new Error('JWT_SECRET is required but not configured');
    }
    
    if (!jwtRefreshSecret) {
      this.logger.error('JWT_REFRESH_SECRET is not configured');
      throw new Error('JWT_REFRESH_SECRET is required but not configured');
    }
    
    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      secret: jwtSecret,
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN') || '1h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: jwtRefreshSecret,
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
    });

    this.logger.debug(`Tokens generated successfully for user: ${userId}`);

    return {
      accessToken,
      refreshToken,
    };
  }
}

