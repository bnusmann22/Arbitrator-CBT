import {
  Injectable,
  Inject,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as admin from 'firebase-admin';
import { UserRole } from '@arbitration/types';
import { JwtPayload } from './strategies/jwt.strategy';
import { AdminLoginDto } from './dto/admin-login.dto';
import { CandidateLoginDto } from './dto/candidate-login.dto';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject('FIRESTORE') private readonly firestore: admin.firestore.Firestore,
    private readonly jwtService: JwtService,
  ) {}

  // ─── Admin Auth ───────────────────────────────────────────────────────────

  async validateAdmin(dto: AdminLoginDto): Promise<AuthUser> {
    const snapshot = await this.firestore
      .collection('admins')
      .where('email', '==', dto.email.toLowerCase())
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    const passwordMatch = await bcrypt.compare(dto.password, data.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return {
      id: doc.id,
      email: data.email as string,
      name: data.name as string,
      role: UserRole.ADMIN,
    };
  }

  // ─── Candidate Auth ───────────────────────────────────────────────────────

  async validateCandidate(dto: CandidateLoginDto): Promise<AuthUser> {
    // Match on email + examCode
    const snapshot = await this.firestore
      .collection('candidates')
      .where('email', '==', dto.email.toLowerCase())
      .where('examCode', '==', dto.examCode.toUpperCase())
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new UnauthorizedException(
        'No candidate found with that email and exam code.',
      );
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    // Name check — case-insensitive partial match to handle minor typos in form
    const storedName = (data.name as string).toLowerCase().trim();
    const providedName = dto.name.toLowerCase().trim();
    if (!storedName.includes(providedName) && !providedName.includes(storedName)) {
      throw new UnauthorizedException(
        'The name you provided does not match our records.',
      );
    }

    // Check that the candidate is not already disqualified
    if (data.status === 'disqualified') {
      throw new UnauthorizedException(
        'Your account has been disqualified. Please contact the administrator.',
      );
    }

    return {
      id: doc.id,
      email: data.email as string,
      name: data.name as string,
      role: UserRole.CANDIDATE,
    };
  }

  // ─── Token Signing ────────────────────────────────────────────────────────

  signToken(user: AuthUser): string {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }

  // ─── GET /auth/me ─────────────────────────────────────────────────────────

  async getMe(payload: JwtPayload): Promise<AuthUser> {
    if (payload.role === UserRole.ADMIN) {
      const doc = await this.firestore.collection('admins').doc(payload.sub).get();
      if (!doc.exists) throw new NotFoundException('Admin account not found.');
      const data = doc.data()!;
      return {
        id: doc.id,
        email: data.email as string,
        name: data.name as string,
        role: UserRole.ADMIN,
      };
    }

    // Candidate
    const doc = await this.firestore.collection('candidates').doc(payload.sub).get();
    if (!doc.exists) throw new NotFoundException('Candidate account not found.');
    const data = doc.data()!;
    return {
      id: doc.id,
      email: data.email as string,
      name: data.name as string,
      role: UserRole.CANDIDATE,
    };
  }
}
