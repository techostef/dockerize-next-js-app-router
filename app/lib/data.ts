import { Client } from "pg";
import {
  CustomerField,
  CustomersTable,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  User,
  Revenue,
} from "./definitions";
import { formatCurrency } from "./utils";
import { unstable_noStore as noStore } from "next/cache";
import { getConnection } from "@/auth";

export async function fetchRevenue() {
  // Add noStore() here prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  noStore();

  try {
    // Artificially delay a reponse for demo purposes.
    // Don't do this in real life :)
    console.log("Fetching revenue data...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const query = `SELECT * FROM revenue`;
    const client = await getConnection();
    const data = await client.query<Revenue>(query);
    await client.end();
    console.log("Data fetch complete after 3 seconds.");

    return data.rows;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch revenue data.");
  }
}

export interface ILatestInvoicesResponse {
  amount: string;
  id: string;
  name: string;
  image_url: string;
  email: string;
}

export async function fetchLatestInvoices(): Promise<
  ILatestInvoicesResponse[]
> {
  // Add noStore() here prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  noStore();

  try {
    const query = `
      SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      ORDER BY invoices.date DESC
      LIMIT 5`;

    const client = await getConnection();
    const data = await client.query<LatestInvoiceRaw>(query);
    await client.end();

    const latestInvoices = data.rows.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch the latest invoices.");
  }
}

export interface ICardResponse {
  numberOfCustomers: number;
  numberOfInvoices: number;
  totalPaidInvoices: string;
  totalPendingInvoices: string;
}

export async function fetchCardData(): Promise<ICardResponse> {
  // Add noStore() here prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  noStore();

  try {
    // You can probably combine these into a single SQL query
    // However, we are intentionally splitting them to demonstrate
    // how to initialize multiple queries in parallel with JS.

    const queryInvoiceCount = "SELECT COUNT(*) FROM invoices";
    const queryCustomersCount = "SELECT COUNT(*) FROM customers";
    const queryInvoiceStatus = `SELECT
    SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
    SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
    FROM invoices`;

    const client = await getConnection();

    const data = await Promise.all([
      client.query(queryInvoiceCount),
      client.query(queryCustomersCount),
      client.query(queryInvoiceStatus),
    ]);

    await client.end();

    const numberOfInvoices = Number(data[0].rows[0].count ?? "0");
    const numberOfCustomers = Number(data[1].rows[0].count ?? "0");
    const totalPaidInvoices = formatCurrency(data[2].rows[0].paid ?? "0");
    const totalPendingInvoices = formatCurrency(data[2].rows[0].pending ?? "0");

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to card data.");
  }
}

export async function fetchDashboardData() {
  try {
    const data = await Promise.all([
      await fetchRevenue(),
      await fetchLatestInvoices(),
      await fetchCardData(),
    ]);

    return {
      revenue: data[0],
      latestInvoices: data[1],
      cardData: data[2],
    };
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to card data.");
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number
) {
  // Add noStore() here prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  noStore();

  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const queryInvoices = `
      SELECT
        invoices.id,
        invoices.amount,
        invoices.date,
        invoices.status,
        customers.name,
        customers.email,
        customers.image_url
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name ILIKE '${`%${query}%`}' OR
        customers.email ILIKE '${`%${query}%`}' OR
        invoices.amount::text ILIKE '${`%${query}%`}' OR
        invoices.date::text ILIKE '${`%${query}%`}' OR
        invoices.status ILIKE '${`%${query}%`}'
      ORDER BY invoices.date DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `;
    const client = await getConnection();
    const invoices = await client.query<InvoicesTable>(queryInvoices);
    await client.end();

    return invoices.rows;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch invoices.");
  }
}

export async function fetchInvoicesPages(query: string) {
  // Add noStore() here prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  noStore();

  try {
    const queryCount = `SELECT COUNT(*)
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name ILIKE '${`%${query}%`}' OR
        customers.email ILIKE '${`%${query}%`}' OR
        invoices.amount::text ILIKE '${`%${query}%`}' OR
        invoices.date::text ILIKE '${`%${query}%`}' OR
        invoices.status ILIKE '${`%${query}%`}'
    `;

    const client = await getConnection();
    const count = await client.query(queryCount);
    await client.end();

    const totalPages = Math.ceil(Number(count.rows[0].count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch total number of invoices.");
  }
}

export async function fetchInvoiceById(id: string) {
  // Add noStore() here prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  noStore();

  try {
    const query = `
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = '${id}';
    `;

    const client = await getConnection();
    const data = await client.query<InvoiceForm>(query);
    await client.end();

    const invoice = data.rows.map((invoice) => ({
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    }));

    return invoice[0];
  } catch (error) {
    console.error("Database Error:", error);
  }
}

export async function fetchCustomers() {
  // Add noStore() here prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  noStore();

  try {
    const query = `
      SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC
    `;

    const client = await getConnection();
    const data = await client.query<CustomerField>(query);
    await client.end();

    const customers = data.rows;
    return customers;
  } catch (err) {
    console.error("Database Error:", err);
    throw new Error("Failed to fetch all customers.");
  }
}

export async function fetchFilteredCustomers(query: string) {
  // Add noStore() here prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  noStore();

  try {
    const queryCustomersTable = `
      SELECT
        customers.id,
        customers.name,
        customers.email,
        customers.image_url,
        COUNT(invoices.id) AS total_invoices,
        SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
        SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
      FROM customers
      LEFT JOIN invoices ON customers.id = invoices.customer_id
      WHERE
        customers.name ILIKE '${`%${query}%`}' OR
          customers.email ILIKE '${`%${query}%`}'
      GROUP BY customers.id, customers.name, customers.email, customers.image_url
      ORDER BY customers.name ASC
	  `;

    const client = await getConnection();
    const data = await client.query<CustomersTable>(queryCustomersTable);
    await client.end();

    const customers = data.rows.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error("Database Error:", err);
    throw new Error("Failed to fetch customer table.");
  }
}

export async function getUser(email: string) {
  // Add noStore() here prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  noStore();

  try {
    const query = `SELECT * from USERS where email='${email}'`;
    
    const client = await getConnection();
    const user = await client.query<User>(query);
    await client.end();
    
    return user.rows[0] as User;
  } catch (error) {
    console.error("Failed to fetch user:", error);
    throw new Error("Failed to fetch user.");
  }
}
