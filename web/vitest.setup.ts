// Carrega o .env e, nos testes, aponta para o banco de teste.
import 'dotenv/config'

if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
if (!process.env.PAYLOAD_SECRET) process.env.PAYLOAD_SECRET = 'segredo-de-teste-0123456789abcdef'
