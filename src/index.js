const express = require("express");
const cors = require("cors");

const { v4: uuidv4, validate } = require("uuid");

const app = express();
app.use(express.json());
app.use(cors());

const users = [];

const getUserByUsername = (username) => {
  const user = users.find((searchedUser) => searchedUser.username === username);

  return user;
};
const getUserById = (id) => {
  const user = users.find((searchedUser) => searchedUser.id === id);

  return user;
};

const isValidUUID = (uuid) => {
  return validate(uuid);
};

const getTodoFromUser = (user, todoId) => {
  const todo = user.todos.find((searchedTodo) => searchedTodo.id === todoId);
  return todo;
};

const checksExistsUserAccount = (req, res, next) => {
  const { username } = req.headers;

  const user = getUserByUsername(username);

  if (!user) return res.status(404).json({ error: "User doest not exist" });

  req.user = user;
  next();
};

const checksCreateTodosUserAvailability = (req, res, next) => {
  const { user } = req;

  if (!user.pro && user.todos.length >= 9)
    return res.status(403).json({
      error:
        "This user reached max To Do's available for this plan. Please complete one or go pro. ",
    });

  next();
};

const checksTodoExists = (req, res, next) => {
  const { username } = req.headers;
  const { id } = req.params;

  const user = getUserByUsername(username);

  if (!user) return res.status(404).json({ error: "User doest not exist." });

  if (!validate(id))
    return res.status(400).json({ error: "Invalid To Do Id." });

  const todo = getTodoFromUser(user, id);

  if (!todo)
    return res
      .status(404)
      .json({ error: "This user does not have any todo with this Id." });

  req.user = user;
  req.todo = todo;

  next();
};

const findUserById = (req, res, next) => {
  const { id } = req.params;

  const user = getUserById(id);

  if (!user) return res.status(404).json({ error: "User doest not exist" });

  req.user = user;
  next();
};

app.post("/users", (req, res) => {
  const { name, username } = req.body;

  const usernameAlreadyExists = users.some(
    (user) => user.username === username
  );

  if (usernameAlreadyExists) {
    return res.status(400).json({ error: "Username already exists" });
  }

  const user = {
    id: uuidv4(),
    name,
    username,
    pro: false,
    todos: [],
  };

  users.push(user);

  return res.status(201).json(user);
});

app.get("/users/:id", findUserById, (req, res) => {
  const { user } = req;

  return res.json(user);
});

app.patch("/users/:id/pro", findUserById, (req, res) => {
  const { user } = req;

  if (user.pro) {
    return res.status(400).json({ error: "Pro plan is already activated." });
  }

  user.pro = true;

  return res.json(user);
});

app.get("/todos", checksExistsUserAccount, (req, res) => {
  const { user } = req;

  return res.json(user.todos);
});

app.post(
  "/todos",
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  (req, res) => {
    const { title, deadline } = req.body;
    const { user } = req;

    const newTodo = {
      id: uuidv4(),
      title,
      deadline: new Date(deadline),
      done: false,
      created_at: new Date(),
    };

    user.todos.push(newTodo);

    return res.status(201).json(newTodo);
  }
);

app.put("/todos/:id", checksTodoExists, (req, res) => {
  const { title, deadline } = req.body;
  const { todo } = req;

  todo.title = title;
  todo.deadline = new Date(deadline);

  return res.json(todo);
});

app.patch("/todos/:id/done", checksTodoExists, (request, res) => {
  const { todo } = request;

  todo.done = true;

  return res.json(todo);
});

app.delete(
  "/todos/:id",
  checksExistsUserAccount,
  checksTodoExists,
  (request, res) => {
    const { user, todo } = request;

    const todoIndex = user.todos.indexOf(todo);

    if (todoIndex === -1) {
      return res.status(404).json({ error: "Todo not found" });
    }

    user.todos.splice(todoIndex, 1);

    return res.status(204).send();
  }
);

module.exports = {
  app,
  users,
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  checksTodoExists,
  findUserById,
};
