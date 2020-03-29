var express = require("express");
var exphbs = require("express-handlebars");
var mongoose = require("mongoose");
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/scrape"
// var logger = require("morgan");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");
var Comment = require("./models/Comment")

var PORT = process.env.PORT || 3000;
console.log("connected on port: "+ PORT);

// Initialize Express
var app = express();


// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

app.engine("handlebars", exphbs({defaultLayout: "main"}));
app.set("view engine", "handlebars");

// Connect to the Mongo DB
mongoose.connect(MONGODB_URI);



// Routes
app.get("/", function(req, res) {
  db.Article.find({})
    .then(function(found) {
      console.log("inital page load", found);
      // res.json(found);
      var hbsObj = {
        article : found
      };
     
      console.log("hbsObj", hbsObj);
      res.render("index", hbsObj);
    })
    .catch(function(err) {
      //console.log("err", err);
      res.json(err);
    });
});



app.get("/scrape-art", function(req, res) {
//   // First, we grab the body of the html with axios
  axios.get("https://www.theonion.com/").then(async function(response) {
//     // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);
    

//     // Now, we grab every h2 within an article tag, and do the following:
   $(".sc-1pw4fyi-1").each(function (i, element) {
    
      //       // Save an empty result object
      var result = {};
      //       // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this)
        .children("a")
        .children("h4")
        .text();
      result.link = $(this)
        .children("a")
        .attr("href");
      result.body = $(this)
        .children("a")
        .children("p")
        .text();
        
      //       // Create a new Article using the `result` object built from scraping
      db.Article.create(result)

        .then(function (dbArticle) {
          //           // View the added result in the console
          console.log(dbArticle);
          
        })
        .catch(function (err) {
          // If an error occurred, log it
          console.log(err);
        });
      
    });

//     // Send a message to the client

    res.redirect("/");

  
  });
});

// // Route for getting all Articles from the db
app.get("/articles", function(req, res) {
//   // Grab every document in the Articles collection
  db.Article.find({})
    .then(function(dbArticle) {
//       // If we were able to successfully find Articles, send them back to the client
    console.log(dbArticle)  
    res.json(dbArticle);
    })
    .catch(function(err) {
//       // If an error occurred, send it to the client
      res.json(err);
    });
});

// // Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
//   // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findById( req.params.id )
//     // ..and populate all of the notes associated with it
    .populate("comments")
    .then(function(dbArticle) {
//       // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
//       // If an error occurred, send it to the client
      res.json(err);
    });
});

// // Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  var newComment = new Comment(req.body);
//   // Create a new note and pass the req.body to the entry
  newComment.save(function (err, doc) {
    if (err){
      console.log(err)
    } else{
      db.Article.findOneAndUpdate({ _id: req.params.id }, {$push: { comment: req.body._id }}, { new: true })
      .exec(function(err, doc){
        if (err){
          console.log(err)
        } else{
          res.json(doc)
         
        }
        
      })
    }
//       // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
//       // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
//       // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
       
    })
   
});

app.delete('/comment/:id', function(req, res) {
  
Comment.findOneAndRemove(req.params.id)
.then(function(data){
  res.status(200).send(data);
})
.catch(function (err){
  res.json(err)
})
});



// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
