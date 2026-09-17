import { getDb } from "../src/db";
import { documentCategories, stages, users } from "../src/db/schema";
import { hashPassword } from "../src/lib/security";

async function seed(){const db=getDb();await db.insert(stages).values([{name:"Novos leads",position:10,color:"#5477bf"},{name:"Em contato",position:20,color:"#d49a42"},{name:"Visita",position:30,color:"#8b69b1"},{name:"Proposta",position:40,color:"#329477"},{name:"Ganho",position:50,color:"#24664f",isWon:true},{name:"Perdido",position:60,color:"#8a5555",isLost:true}]).onConflictDoNothing();await db.insert(documentCategories).values([{name:"Matrícula",entityType:"property"},{name:"IPTU",entityType:"property"},{name:"Documento pessoal",entityType:"owner"}]).onConflictDoNothing();const email=process.env.SEED_ADMIN_EMAIL;const password=process.env.SEED_ADMIN_PASSWORD;if(email&&password)await db.insert(users).values({name:"Administrador",email:email.toLowerCase(),passwordHash:await hashPassword(password),role:"admin"}).onConflictDoNothing();console.log("Seed concluído sem exibir credenciais.")}
seed().catch((error)=>{console.error(error instanceof Error?error.message:"Falha no seed");process.exit(1)});
