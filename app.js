const pool =require('./database')
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const path = require("path");
const multer = require("multer");//for image storage



app.use(express.static('./Public'));
app.use(bodyParser.urlencoded({ extended: true }));
// Set EJS as the view engine
app.set("view engine", "ejs"); 
// Set the views directory
app.set("views", __dirname + "/views");

app.get("/", async (req, res, next) => {
  const subscribers = await pool.query("Select * from new_subscriber");

  // Add the base path to each subscriber's image path
  const basePath = "/images/";
  subscribers.rows.forEach(subscriber => {
    if (subscriber.file_image) {
      subscriber.file_image = basePath + path.basename(subscriber.file_image);
    }
  });

  res.render('subscriberlist.ejs', { subscribers: subscribers.rows });
});



app.get("/signup", function(req, res) {
  res.sendFile(__dirname + "/signup.html");
});


app.get("/success", function(req, res) {
  const fName = req.query.fName;
  const lName = req.query.lName;
  const email = req.query.email;
  res.render("success", { fName, lName, email });

})

/////////////
//Handling Images problems//

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "Images"); // Destination folder for storing images
    },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });
app.use('/Images', express.static('Images'));


//////////////////////////////////

///////////////////////////////////
app.post("/Images", upload.single("image"), async (req, res) => {
  var first_name = req.body.fName;
  var last_name = req.body.lName;
  var email_id = req.body.email;
  var password = req.body.password; 

  const file = req.file;
  let file_image = null; // Initialize with null
  if (file) {
    file_image = file.path; // Path to the uploaded image
  }


  const subscriber = await pool.query("SELECT * FROM new_subscriber WHERE email_id = $1", [email_id]);
  console.log(subscriber);
  
  if (subscriber.rows.length > 0) {
    res.send(`<script>alert('Subscriber with this email already exists.'); window.location.href = '/signup';</script>`);
  } else {
    const queryText = 'INSERT INTO new_subscriber (email_id, first_name, last_name, status, password, file_image) VALUES ($1, $2, $3, $4, $5, $6)';
    const values = [email_id, first_name, last_name, 'subscribed', password, file_image];

    pool.query(queryText, values, (error, result) => {
      if (error) {
        console.error(error);
        res.sendFile(__dirname + "/failure.html");
      } else {
        const statusCode = 200;
        if (statusCode === 200) {
          // Render the success template with subscriber details
          res.redirect(`/success?fName=${encodeURIComponent(first_name)}&lName=${encodeURIComponent(last_name)}&email=${encodeURIComponent(email_id)}`);
        } else {
          res.sendFile(__dirname + "/failure.html");
        }
      }
    }); 
  }
});



///////////////////////////////////////////////////////
          //After collecting Data//
//////////////////////////////////////////////////////


// Edit query for Subscriberslist
app.get("/edit/:id", async (req, res) => {
  const subscriberId = req.params.id;
  const subscriber = await pool.query("SELECT * FROM new_subscriber WHERE id = $1", [subscriberId]);

  if (subscriber.rows.length === 0) {
    res.sendFile(__dirname + "/failure.html"); // Handle not found scenario
  } else {
    res.render("editSubscriber", { subscriber: subscriber.rows[0] });
  }
});


//Update query for Subscriberslist
app.post("/update/:id", async (req, res) => {
  const Id = req.params.id;
  const { first_name, last_name, email_id } = req.body;

  // Check if the updated email_id already exists in the database
  const checkEmailQuery = "SELECT id FROM new_subscriber WHERE id != $2 AND email_id = $1";
  const checkEmailValues = [email_id, Id];

  pool.query(checkEmailQuery, checkEmailValues, (checkError, checkResult) => {
    if (checkError) {
      console.error(checkError);
      res.sendFile(__dirname + "/failure.html");
      return;
    }

    if (checkResult.rows.length > 0) {
      // If email_id already exists, send failure response
      res.render("failure_email_exists", { subscriber: { id: Id } });//pass the subscriber object
      return;
    }

    // If email_id is unique, proceed with the update
    const updateQuery = `UPDATE new_subscriber SET first_name = $1, last_name = $2, email_id = $3 WHERE id = $4`;
    const updateValues = [first_name, last_name, email_id, Id];

    pool.query(updateQuery, updateValues, (updateError, updateResult) => {
      if (updateError) {
        console.error(updateError);
        res.sendFile(__dirname + "/failure.html");
      } else {
        res.redirect("/"); // Redirect to the main page after update
      }
    });
  });
});



///////////////////////////////////
// Delete query for Subscriberslist
app.get("/delete/:id", async (req, res) => {
  const Id = req.params.id;

  const queryText = `DELETE FROM new_subscriber WHERE id = $1`;

  pool.query(queryText, [Id], (error, result) => {
    if (error) {
      console.error(error);
      res.sendFile(__dirname + "/failure.html");
    } else {
      res.redirect("/"); // Redirect to the main page after deletion
    }
  });
});

/////////////////////////////////////////
        //Connecting Routers//
/////////////////////////////////////////

app.post("/duplicate", function(req, res) {
  res.redirect("/signup");
});

app.post("/failure", function(req, res) {
  res.redirect("/signup");
});

app.listen(4500, function() {
  console.log("Server is running on port 4500");
}); 