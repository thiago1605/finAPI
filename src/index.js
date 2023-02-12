import express, { json } from "express";
import { v4 as uuid } from "uuid";

const app = express(),
  port = process.env.port ?? 3333,
  customers = [];
app.use(json());

/*
 * cpf - string
 * name - string
 * id - uuid
 * statement - []
 */

//Middleware
const verifyIfExistsAccountCPF = (request, response, next) => {
  const { cpf: cpfHeader } = request.headers;

  const customer = customers.find(({ cpf }) => cpfHeader === cpf);

  if(!customer) response.status(400).json({ error: "Customer not found!" });
  else {
    request.customer = customer;
    return next();
  }

};
//--------------

const getBalance = (statement) =>(
  statement.reduce((acc, { type, amount }) => {
    type === "credit"
      ? (acc += amount)
      : (acc > 0 && acc >= amount) && (acc -= amount);

    return acc;
  }, 0)
);

app.post("/account", (request, response) => {
  const { cpf, name } = request.body;

  const customerAlredyExists = customers.some(
    ({ cpf: cpfParam }) => cpfParam === cpf
  );

  customerAlredyExists &&
    response.status(400).json({ error: "Customer already exists!" });

  customers.push({
    cpf,
    name,
    id: uuid(),
    statement: [],
  });

  return response.status(201).send();
});

app.get("/statement", verifyIfExistsAccountCPF, (request, response) => {
  const { statement } = request.customer;

  statement.length === 0 ?
    response.json({ message: "Statement empty!" }): 
    response.status(200).json(statement);
});

app.post("/deposit", verifyIfExistsAccountCPF, (request, response) => {
  const 
    { description, amount } = request.body,
    { statement } = request.customer
  ;

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: "credit",
  };

  statement.push(statementOperation);

  return response.status(201).send();
});

app.post("/withdraw", verifyIfExistsAccountCPF, (request, response) => {
  const 
    { amount } = request.body,
    { statement } = request.customer,
    balance = getBalance(statement)
  ;

  balance < amount &&
    response.status(400).json({ error: "Insufficient funds!" });

  const statementOperation = {
    amount,
    created_at: new Date(),
    type: "debit",
  };

  statement.push(statementOperation);

  return response.status(201).send();
});

app.get("/statement/date", verifyIfExistsAccountCPF, (request, response) => {
  const 
    { statement } = request.customer,
    { date } = request.query
  ;

  const dateFormat = new Date(date + " 00:00");

  const filtered_statement = statement.filter(
      ({created_at}) => 
        created_at.toDateString() === new Date(dateFormat).toDateString()
  );

  filtered_statement.length === 0
    ? response.status(400).json({
        error: `No statement found at date ${date} !`
      })
    : response.status(200).json(filtered_statement);
});

app.put("/account", verifyIfExistsAccountCPF, (request, response) => {
  const 
    { new_name } = request.body,
    { customer } = request
  ;

  customer.name = new_name;

  return response.status(201).send();
});

app.get("/account", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  return response.status(200).json(customer);
});

app.delete("/account", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  customers.splice(customer, 1);

  response.status(200).json(customers);
});

app.get("/balance", verifyIfExistsAccountCPF, (request, response) => {
  const { statement } = request.customer;
  const balance = getBalance(statement);

  return response.status(200).json(balance);
});

app.listen(port, () => console.log("Listening on port " + port + "!"));
