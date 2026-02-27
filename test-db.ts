import { db } from "./src/lib/db";
async function main() {
    const accountCount = await db.account.count();
    console.log("Account count:", accountCount);
}
main();
