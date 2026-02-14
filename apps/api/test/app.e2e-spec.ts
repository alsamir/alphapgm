import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/common/redis/redis.service';

// Set required env vars before module initialization
process.env.JWT_SECRET = 'test-jwt-secret-for-e2e';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-for-e2e';
process.env.JWT_EXPIRATION = '15m';
process.env.JWT_REFRESH_EXPIRATION = '7d';
process.env.STRIPE_SECRET_KEY = '';
process.env.ANTHROPIC_API_KEY = '';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

describe('App (e2e)', () => {
  let app: INestApplication;

  const mockPrisma = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    role: {
      findFirst: jest.fn(),
    },
    userRole: {
      create: jest.fn(),
    },
    creditBalance: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    creditLedger: {
      create: jest.fn(),
    },
    settingUser: {
      create: jest.fn(),
    },
    allData: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      groupBy: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    priceMetals: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    pricePercentage: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    plan: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    subscription: {
      findUnique: jest.fn(),
    },
    aiChat: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(undefined),
    getClient: jest.fn().mockReturnValue({
      on: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
    }),
    onModuleDestroy: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(RedisService)
      .useValue(mockRedis)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset default mock returns that may have been overridden per test
    mockRedis.get.mockResolvedValue(null);
    mockPrisma.priceMetals.findMany.mockResolvedValue([]);
    mockPrisma.pricePercentage.findFirst.mockResolvedValue(null);
    mockPrisma.allData.count.mockResolvedValue(0);
  });

  describe('Health', () => {
    it('GET /api/v1/health should return 200 with status ok', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('uptime');
        });
    });

    it('GET /api/v1/health should return uptime as a number', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(typeof res.body.uptime).toBe('number');
          expect(res.body.uptime).toBeGreaterThanOrEqual(0);
        });
    });
  });

  describe('Auth flow', () => {
    const registerBody = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'securePassword123',
      name: 'Test User',
    };

    describe('POST /api/v1/auth/register', () => {
      it('should register a new user and return tokens', async () => {
        mockPrisma.user.findFirst.mockResolvedValue(null);
        mockPrisma.role.findFirst.mockResolvedValue({ id: 1, name: 'ROLE_USER' });
        mockPrisma.$transaction.mockImplementation(async (callback: any) => {
          const tx = {
            user: {
              create: jest.fn().mockResolvedValue({
                userId: BigInt(1),
                email: registerBody.email,
                username: registerBody.username,
                name: registerBody.name,
              }),
            },
            userRole: { create: jest.fn() },
            creditBalance: { create: jest.fn() },
            creditLedger: { create: jest.fn() },
            settingUser: { create: jest.fn() },
          };
          return callback(tx);
        });

        const res = await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send(registerBody)
          .expect(201);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('user');
        expect(res.body.data).toHaveProperty('tokens');
        expect(res.body.data.user.email).toBe(registerBody.email);
        expect(res.body.data.tokens).toHaveProperty('accessToken');
      });

      it('should return 409 for duplicate email', async () => {
        mockPrisma.user.findFirst.mockResolvedValue({
          email: registerBody.email,
          username: 'other',
        });

        const res = await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send(registerBody)
          .expect(409);

        expect(res.body.message).toContain('Email already registered');
      });
    });

    describe('POST /api/v1/auth/login', () => {
      it('should login with valid credentials and return 200', async () => {
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash('password123', 12);

        mockPrisma.user.findFirst.mockResolvedValue({
          userId: BigInt(1),
          email: 'login@example.com',
          username: 'loginuser',
          password: hashedPassword,
          name: 'Login User',
          roles: [{ role: { name: 'ROLE_USER' } }],
          subscription: null,
        });
        mockPrisma.user.update.mockResolvedValue({});

        const res = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: 'login@example.com', password: 'password123' })
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.user.email).toBe('login@example.com');
        expect(res.body.data.tokens.accessToken).toBeDefined();
      });

      it('should return 401 for invalid credentials', async () => {
        mockPrisma.user.findFirst.mockResolvedValue(null);

        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: 'nonexistent@example.com', password: 'wrong' })
          .expect(401);
      });
    });

    describe('GET /api/v1/auth/me', () => {
      it('should return 401 when no token is provided', async () => {
        await request(app.getHttpServer())
          .get('/api/v1/auth/me')
          .expect(401);
      });

      it('should return user data when valid token is provided', async () => {
        // First register/login to get a token
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash('password123', 12);

        mockPrisma.user.findFirst.mockResolvedValue({
          userId: BigInt(1),
          email: 'me@example.com',
          username: 'meuser',
          password: hashedPassword,
          name: 'Me User',
          roles: [{ role: { name: 'ROLE_USER' } }],
          subscription: null,
        });
        mockPrisma.user.update.mockResolvedValue({});

        const loginRes = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: 'me@example.com', password: 'password123' })
          .expect(200);

        const accessToken = loginRes.body.data.tokens.accessToken;

        // Mock validateUser for the JWT strategy
        mockPrisma.user.findUnique.mockResolvedValue({
          userId: BigInt(1),
          email: 'me@example.com',
          username: 'meuser',
          name: 'Me User',
          roles: [{ role: { name: 'ROLE_USER' } }],
          subscription: { plan: { slug: 'free' } },
        });

        const meRes = await request(app.getHttpServer())
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(meRes.body.success).toBe(true);
        expect(meRes.body.data).toHaveProperty('email', 'me@example.com');
        expect(meRes.body.data).toHaveProperty('username', 'meuser');
      });
    });
  });

  describe('Converters', () => {
    describe('GET /api/v1/converters', () => {
      it('should return paginated converter list', async () => {
        const mockConverters = [
          {
            id: 1,
            name: 'Test Converter',
            nameModified: 'test-converter',
            urlPath: 'test-converter.html',
            brand: 'Toyota',
            weight: '1.5',
            brandImage: null,
            createdDate: new Date(),
            pt: '2.5',
            pd: '1.2',
            rh: '0.3',
            prices: '100',
            imageUrl: 'http://example.com/img.jpg',
            keywords: 'test',
          },
        ];

        mockPrisma.allData.findMany.mockResolvedValue(mockConverters);

        const res = await request(app.getHttpServer())
          .get('/api/v1/converters')
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('page');
        expect(res.body.data).toHaveProperty('limit');
        expect(res.body.data).toHaveProperty('hasMore');
        expect(Array.isArray(res.body.data.data)).toBe(true);
      });

      it('should not expose metal data (pt, pd, rh) in search results', async () => {
        mockPrisma.allData.findMany.mockResolvedValue([
          {
            id: 1,
            name: 'Test',
            nameModified: 'test',
            urlPath: 'test.html',
            brand: 'Toyota',
            weight: '1',
            brandImage: null,
            createdDate: new Date(),
            pt: '2.5',
            pd: '1.0',
            rh: '0.5',
            prices: '200',
            imageUrl: 'img.jpg',
            keywords: 'test',
          },
        ]);

        const res = await request(app.getHttpServer())
          .get('/api/v1/converters')
          .expect(200);

        const converter = res.body.data.data[0];
        expect(converter).not.toHaveProperty('pt');
        expect(converter).not.toHaveProperty('pd');
        expect(converter).not.toHaveProperty('rh');
        expect(converter).not.toHaveProperty('prices');
        expect(converter).toHaveProperty('name');
        expect(converter).toHaveProperty('brand');
      });

      it('should accept query parameters for search', async () => {
        mockPrisma.allData.findMany.mockResolvedValue([]);

        await request(app.getHttpServer())
          .get('/api/v1/converters?query=toyota&brand=Toyota&page=1&limit=10')
          .expect(200);

        expect(mockPrisma.allData.findMany).toHaveBeenCalled();
      });
    });

    describe('GET /api/v1/converters/brands', () => {
      it('should return brands list', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockPrisma.allData.groupBy.mockResolvedValue([
          { brand: 'BMW', _count: { id: 5 } },
          { brand: 'Toyota', _count: { id: 15 } },
        ]);

        const res = await request(app.getHttpServer())
          .get('/api/v1/converters/brands')
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });
    });

    describe('GET /api/v1/converters/:id', () => {
      it('should return 401 for unauthenticated detail request', async () => {
        await request(app.getHttpServer())
          .get('/api/v1/converters/1')
          .expect(401);
      });
    });
  });
});
