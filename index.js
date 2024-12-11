const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const app = express();
const port = 3000;

// ini untuk koneksi/membuat koneksi kedatabasnya seperti minggu minggu lalu
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "kuis_api",
});

// Penecekan koneksi
connection.connect((error) => {
  if (error) {
    console.error("Database is disconect!");
    console.error(error);
  } else {
    console.log("Database is connected");
  }
});

// fungsi respon ini nanti bang supaya payloadnya lebih terstruktur tapi opsional pakenya heheee
const response = (StatusCode, error, data, message, res) => {
  res.status(StatusCode).json({
    payload: {
      status_code: StatusCode,
      error: error,
      data: data,
      message: message,
    },
  });
};

// ini middlewarennya tapi ini saya komen aja biar gk jalan dulu diaa hehehehee
// Application Level Middleware
// app.use(
//   (req, res, next) => {
//     console.log("Request URL:", req.originalUrl);
//     next();
//   },
//   (req, res, next) => {
//     console.log("Request Type:", req.method);
//     next();
//   }
// );

// Router Level Middleware
// const myMiddleware = (req, res, next)=>{
//   console.log(`${req.url} ${req.method}`)
//   next()
// }
// app.use(myMiddleware)

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/notes", (req, res) => {
  const title = req.query.search;
  const limit = req.query.limit;
  const page = req.query.page;
  const sort = req.query.sort;

  const offset = (page - 1) * limit;

  const sql = `
    SELECT 
      notes.id,
      notes.title,
      notes.note,
      notes.categoryid,
      category.category AS category,
      notes.createAt,
      notes.updateAt
    FROM 
      notes
    LEFT JOIN 
      category ON notes.categoryid = category.id
    WHERE 
      notes.title LIKE ? 
    ORDER BY 
      notes.id ${sort.toUpperCase()} 
    LIMIT ? OFFSET ?`;

  // Menyiapkan parameter untuk query
  const params = [`%${title}%`, Number(limit), Number(offset)];

  let query = connection.query(sql, params, (err, result) => {
    if (err) return res.json(err);
    const totalNote = result.length;

    res.json({
      status: 200,
      data: result,
      totalNote: totalNote,
      page: Number(page),
      sortBy: sort,
      totalPage: Math.ceil(totalNote / limit),
    });
  });
});

// GET List Note by note_id
app.get("/notes/:id", (req, res) => {
  const noteId = parseInt(req.params.id);

  // let sql = `SELECT * FROM notes WHERE id = ? AND deleted = 0`;
  let sql = `SELECT * FROM notes WHERE id = ? AND deleted = 0`;

  let query = connection.query(sql, [noteId], (error, result) => {
    if (error) {
      console.error("Database error:", error);
      return res.status(500).json({
        status: 500,
        message: "Terjadi kesalahan pada server",
      });
    }

    if (result.length === 0) {
      return res.status(404).json({
        status: 404,
        message: "Data tidak ditemukan",
      });
    } else {
      return res.status(200).json({
        status: 200,
        error: false,
        data: result,
        message: "Berhasil Get data dari database",
      });
    }
  });
});

// GET List Note by category_id
app.get("/categories/:id", (req, res) => {
  const title = req.query.search;
  const limit = req.query.limit;
  const page = req.query.page;
  const sort = req.query.sort;
  const offset = (page - 1) * limit;

  const sql = `
  SELECT 
    notes.id,
    notes.title,
    notes.note,
    notes.categoryid,
    category.category AS category,
    category.color,
    notes.createAt,
    notes.updateAt
  FROM 
    notes
  LEFT JOIN 
    category ON notes.categoryid = category.id
  WHERE 
    notes.categoryid = ? AND notes.title LIKE ?
  ORDER BY 
    notes.id ${sort.toUpperCase()} 
  LIMIT ? OFFSET ?`;

  // Menyiapkan parameter untuk query
  const params = [req.params.id, `%${title}%`, Number(limit), Number(offset)];

  let query = connection.query(sql, params, (err, result) => {
    if (err) return res.json(err);
    const totalNote = result.length;
    res.json({
      status: 200,
      data: result,
      totalNote: totalNote,
      page: Number(page),
      sortBy: sort,
      totalPage: Math.ceil(totalNote / limit),
    });
  });
});

// POST
app.post("/notes", (req, res) => {
  const { title, note, categoryid } = req.body;
  let sql = "INSERT INTO notes SET ?";
  
  let query = connection.query(
    sql,
    { title, note, categoryid },
    (error, result) => {
      console.log(req.body);
      if (error) {
        return res.status(500).json({ status: 500, error: true, message: error.message });
      }

      const sqlSelect = `
      SELECT 
          notes.id,
          notes.title,
          notes.note,
          notes.categoryid,
          category.category AS category,
          category.color,
          notes.createAt,
          notes.updateAt
      FROM 
          notes
      LEFT JOIN 
          category ON category.id = notes.categoryid  
      WHERE 
          notes.id = ?`;

      let selectQuery = connection.query(sqlSelect, [result.insertId], (err, result) => {
        if (err) {
          return res.status(500).json({ status: 500, error: true, message: err.message });
        }
        res.json({
          status: 200,
          error: false,
          data: result,
        });
      });
    }
  );
});


// PUT Update Note
app.put("/notes/:id", (req, res) => {
  const { title, note, categoryid } = req.body;
  const noteId = req.params.id;


  let sqlUpdate = `UPDATE notes SET title = ?, note = ?, categoryid = ? WHERE id = ?`;
  
  connection.query(sqlUpdate, [title, note, categoryid, noteId], (error, result) => {
    if (error) {
      return res.status(500).json({
        status: 500,
        message: "Internal server error",
        error: error.message,
      });
    }


    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: 404,
        message: "Note tidak ditemukan",
      });
    }

    const sqlSelect = `
      SELECT 
          notes.id,
          notes.title,
          notes.note,
          notes.categoryid,
          category.category AS category,
          category.color,
          notes.createAt,
          notes.updateAt
      FROM 
          notes
      LEFT JOIN 
          category ON category.id = notes.categoryid  
      WHERE 
          notes.id = ?`;

    connection.query(sqlSelect, [noteId], (err, rows) => {
      if (err) {
        return res.status(500).json({
          status: 500,
          message: "Internal server error",
          error: err.message,
        });
      }

      res.json({
        status: 200,
        error: false,
        data: rows,
      });
    });
  });
});

// DELETE Delete Note
app.delete("/notes/:id", (req, res) => {
  let sql = `DELETE FROM notes WHERE id = ${req.params.id}`;
  let query = connection.query(sql, (error, result) => {
    if (error) throw error;
    res.status(200).json({
      status: 200,
      error: false,
      data: result,
    });
  });
});


// API CATEGORY
// GET List of Category
app.get("/categories", (req, res) => {
  const sql = `
SELECT 
    category.id,
    category.category,
    category.color,
    category.icon,
    notes.createAt,
    notes.updateAt,
    category.deleted
FROM 
    category
LEFT JOIN 
    notes ON category.id = notes.categoryid  
    `;

  let query = connection.query(sql, (err, result) => {
    if (err) return res.json(err);
    res.json({
      status: 200,
      error : false,
      data: result,
    });
  });
});

app.post("/categories", (req, res) => {
  const { category, color, icon } = req.body;
  let sql = "INSERT INTO category SET ?";
  let query = connection.query(
    sql,
    { category, color, icon },
    (error, result) => {
      if (error) throw error;
      const sqlSelect = `
      SELECT 
          category.id,
    category.category,
    category.color,
    category.icon,
    notes.createAt,
    notes.updateAt
FROM 
    category
LEFT JOIN 
    notes ON category.id = notes.categoryid 
WHERE
    category.id =?`;

      let selectQuery = connection.query(sqlSelect, [result.insertId], (err, result) => {
        if (err) {
          return res.status(500).json({ status: 500, error: true, message: err.message });
        }
        res.json({
          status: 200,
          error: false,
          data: result,
        });
      });
     


    }
  );
});

// PUT Update Category
app.put("/categories/:id", (req, res) => {
  const { category, color, icon } = req.body;
  let sql = `UPDATE category SET category = ?, color = ?, icon = ? WHERE id = ?`;
  let query = connection.query(
    sql,
    [category, color, icon, req.params.id],
    (error, result) => {
      if (error) {
        return res.status(500).json({
          status: 500,
          message: "Internal server error",
          error: error.message,
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          status: 404,
          message: "Note tidak ditemukan",
        });
      }

      res.status(200).json({
        status: 200,
        error: false,
        data: result,
      });
    }
  );
});

app.delete("/categories/:id", (req, res) => {
  let sql = `DELETE FROM category WHERE id = ${req.params.id}`;
  let query = connection.query(sql, (error, result) => {
    if (error) throw error;
    res.status(200).json({
      status: 200,
      error: false,
      data: result,
    });
  });
});


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
