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
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, firstName, lastName, role, phone, metadata } = registerDto;

    this.logger.log(`Registration attempt for email: ${email}, role: ${role}`);

    try {
      // Check if user exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        this.logger.warn(`Registration failed: User already exists - ${email}`);
        throw new UnauthorizedException('User with this email already exists');
      }

      // Hash password
      this.logger.debug('Hashing password...');
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      this.logger.log(`Creating user: ${email}`);
      const user = await this.prisma.user.create({
        data: {
          email,
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
        } else if (role === 'BUYER' && (metadata as any).organization) {
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
          }
        }
      }

      // Generate tokens
      this.logger.debug('Generating tokens...');
      const tokens = await this.generateTokens(user.id, user.email, user.role);

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      this.logger.log(`Registration successful: ${email} (${user.id})`);

      return {
        user: userWithoutPassword,
        ...tokens,
      };
    } catch (error) {
      this.logger.error(`Registration error for ${email}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    this.logger.log(`Login attempt for email: ${email}`);

    try {
      // Find user
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        this.logger.warn(`Login failed: User not found - ${email}`);
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
      this.logger.error(`Login error for ${email}: ${error.message}`, error.stack);
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
    
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
      
      this.logger.log(`Token refresh successful for user: ${payload.sub} (${payload.email})`);
      
      const tokens = await this.generateTokens(payload.sub, payload.email, payload.role);
      return tokens;
    } catch (error) {
      this.logger.error(`Token refresh failed: ${error.message}`, error.stack);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async generateTokens(userId: string, email: string, role: string) {
    this.logger.debug(`Generating tokens for user: ${userId} (${email})`);
    
    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_SECRET'),
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN') || '1h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
    });

    this.logger.debug(`Tokens generated successfully for user: ${userId}`);

    return {
      accessToken,
      refreshToken,
    };
  }
}

