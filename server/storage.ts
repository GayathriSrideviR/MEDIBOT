import { asc, eq } from "drizzle-orm";
import { users, chats, type InsertUser, type InsertChat } from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<typeof users.$inferSelect | undefined>;
  getUserByEmail(email: string): Promise<typeof users.$inferSelect | undefined>;
  createUser(user: InsertUser): Promise<typeof users.$inferSelect>;

  // Chats
  getChats(userId: number): Promise<typeof chats.$inferSelect[]>;
  createChat(chat: InsertChat): Promise<typeof chats.$inferSelect>;
}

type DbLike = {
  select: () => any;
  insert: (table: any) => any;
};

export class DatabaseStorage implements IStorage {
  constructor(private readonly db: DbLike) {}

  // Users
  async getUser(id: number) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string) {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser) {
    const [user] = await this.db.insert(users).values(insertUser).returning();
    return user;
  }

  // Chats
  async getChats(userId: number) {
    return await this.db
      .select()
      .from(chats)
      .where(eq(chats.userId, userId))
      .orderBy(asc(chats.createdAt), asc(chats.id));
  }

  async createChat(insertChat: InsertChat) {
    const [chat] = await this.db.insert(chats).values(insertChat).returning();
    return chat;
  }
}

class InMemoryStorage implements IStorage {
  private usersData: typeof users.$inferSelect[] = [];
  private chatsData: typeof chats.$inferSelect[] = [];
  private userIdCounter = 1;
  private chatIdCounter = 1;

  async getUser(id: number) {
    return this.usersData.find((u) => u.id === id);
  }

  async getUserByEmail(email: string) {
    return this.usersData.find((u) => u.email === email);
  }

  async createUser(insertUser: InsertUser) {
    const user: typeof users.$inferSelect = {
      id: this.userIdCounter++,
      ...insertUser,
    };
    this.usersData.push(user);
    return user;
  }

  async getChats(userId: number) {
    return this.chatsData.filter((c) => c.userId === userId);
  }

  async createChat(insertChat: InsertChat) {
    const chat: typeof chats.$inferSelect = {
      id: this.chatIdCounter++,
      userId: insertChat.userId,
      role: insertChat.role,
      message: insertChat.message,
      condition: insertChat.condition ?? null,
      createdAt: new Date(),
    };
    this.chatsData.push(chat);
    return chat;
  }
}

export const storage: IStorage = process.env.DATABASE_URL
  ? new DatabaseStorage((await import("./db")).db as DbLike)
  : new InMemoryStorage();
