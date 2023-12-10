"use server";

import * as yup from "yup";
import { Client } from "pg";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getConnection, signIn } from "@/auth";

const InvoiceSchema = yup.object({
  id: yup.string(),
  customerId: yup.string().required(),
  amount: yup.number().required(),
  status: yup
    .mixed()
    .oneOf(["paid", "pending"] as const)
    .required(),
  date: yup.string(),
});

const CreateInvoice = InvoiceSchema.omit(["id", "date"]);

export async function createInvoice(prevState: any, formData: FormData) {
  try {
    const { customerId, amount, status } = CreateInvoice.cast({
      customerId: formData.get("customerId"),
      amount: formData.get("amount"),
      status: formData.get("status"),
    });
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split("T")[0];
    const query = `
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES ('${customerId}', '${amountInCents}', '${
        status as string
      }', '${date}')
    `;
    const client = await getConnection();
    await client.query(query);
    await client.end();
  } catch (error) {
    return {
      message: "Database Error: Failed to Create Invoice.",
    };
  }

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

const UpdateInvoice = InvoiceSchema.omit(["date", "id"]);
// ...

export async function updateInvoice(id: string, formData: FormData) {
  try {
    const { customerId, amount, status } = UpdateInvoice.cast({
      customerId: formData.get("customerId"),
      amount: formData.get("amount"),
      status: formData.get("status"),
    });

    const amountInCents = amount * 100;

    const query = `
      UPDATE invoices
      SET customer_id = '${customerId}', amount = '${amountInCents}', status = '${
        status as string
      }'
      WHERE id = '${id}'
    `;
    const client = await getConnection();
    await client.query(query);
    await client.end();
    
  } catch (error) {
    return {
      message: "Database Error: Failed to Edit Invoice.",
    };
  }

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function deleteInvoice(id: string) {
  // throw new Error('Failed to Delete Invoice');
  try {
    const query = `DELETE FROM invoices WHERE id = '${id}'`
    
    const client = await getConnection();
    await client.query(query);
    await client.end();
    revalidatePath("/dashboard/invoices");
    return { message: "Deleted Invoice" };
  } catch (error) {
    return {
      message: "Database Error: Failed to Delete Invoice.",
    };
  }
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData
) {
  try {
    await signIn("credentials", Object.fromEntries(formData));
  } catch (error) {
    if ((error as Error).message.includes("CredentialsSignin")) {
      return "CredentialSignin";
    }
    throw error;
  }
}
