import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { Client } from 'pg';
import * as yup from 'yup';
import type { User } from '@/app/lib/definitions';
import bcrypt from 'bcrypt';

import { authConfig } from './auth.config';

export async function getConnection() {
  const client = new Client({
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    database: process.env.POSTGRES_DATABASE,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
  });

  await client.connect();

  return client;
}

async function getUser(email: string): Promise<User | undefined> {
  try {
    const client = await getConnection();
    const user = await client.query(`SELECT * from USERS where email='${email}'`);
    console.log('user', user);
    await client.end();
    return user.rows[0] as User;
  } catch (error) {
    console.log('error', error)
    throw new Error('Failed to fetch user.');
  }
}

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      authorize: async (credentials) => {
        try {
          const parsedCredentials = yup
          .object({ email: yup.string().email().required(), password: yup.string().min(6).required() })
          .cast(credentials);
          
          const { email, password } = parsedCredentials;
          const user = await getUser(email);

          console.log("user", user)
          
          if (!user) return null;

          const passwordsMatch = await bcrypt.compare(password, user.password);

          if (passwordsMatch) return user;

        } catch (err) {
          console.log('err', err)
        }
        return null
      },
    }),
  ],
});