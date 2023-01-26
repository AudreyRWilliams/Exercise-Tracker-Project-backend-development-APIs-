const express = require('express')
const mySecret = process.env['MONGO_URI']
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')

//add to stop deprecation warning. false will be the future internal software setting
mongoose.set('strictQuery', false)

const { Schema } = mongoose;

//Schemas based on project description
const userSchema = new Schema({
  "username": String,
})

const exerciseSchema = new Schema({
  "username": String,
  "description": String,
  "duration": Number,
  "date": Date,
})

const logSchema = new Schema({
  "username": String,
  "count": Number,
  "log": Array,
})

//make models based on schemas
const UserInfo = mongoose.model('userInfo', userSchema);
const ExerciseInfo = mongoose.model('exerciseInfo', exerciseSchema);
const LogInfo = mongoose.model('logInfo', logSchema)

//configuration to make sure properly connected to interface
mongoose.connect(mySecret, {
  useNewUrlParser: true,
  useUnifiedTopology: true },
  () => { console.log("Connected to database")}
)

//middleware
app.use(express.urlencoded({ extended: false }))
app.use(express.json())
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//API endpoints below .......

//Post to /api/users with form data username to create a new user.
/* One: check to see if username already exists in the database */
app.post('/api/users', (req, res) => {
  UserInfo.find({ "username": req.body.username}, (err, userData) => {
    if (err) {
      console.log("Error with server", err)
    } else {
      if (userData.length === 0) {
        const test = new UserInfo({
          "_id": req.body.id,
          "username": req.body.username,
        })

        test.save((err, data) => {
          if (err) {
            console.log("Error saving data", err)
          } else {
            /*The returned response from post /api/users with form data username will be an object with username and _id properties */
            res.json({
              "_id": data.id,
              "username": data.username,
              })
          }
        })
      } else {
        res.send("Username already exists")
      }
    }
  })
})

//
/* Two: Post exercise information for the user */
app.post('/api/users/:_id/exercises', (req, res) => {
  let idJson = { "id": req.params._id};
  let checkedDate = new Date(req.body.date);
  let idToCheck = idJson.id

  //if no date is supplied, the current date will be used
  let noDateHandler = () => {
    if (checkedDate instanceof Date && !isNaN(checkedDate)) {
      return checkedDate
    } else {
      checkedDate = new Date();
    }
  }

  UserInfo.findById(idToCheck, (err, data) => {
    noDateHandler(checkedDate);

//Posting to exercises with form data description and duration
    if (err) {
      console.log("error with id", err);
    } else {
      const test = new ExerciseInfo({
        "username": data.username,
        "description": req.body.description,
        "duration": req.body.duration,
        "date": checkedDate.toDateString(),
      })

      test.save((err, data) => {
        if (err) {
          console.log("error saving exercise", err);
        } else {
          console.log("saved exercise successfully");
          //response returned will be the user object with the exercise fields added
          res.json({
            "_id": idToCheck,
            "username": data.username,
            "description": data.description,
            "duration": data.duration,
            "date": data.date.toDateString(),
          })
        }
      })
    
    }
  })

    
})

//This Get request will retrieve a full exercise log of any user
/* Three: Display the exercise log - by id and then by username. Will return the user object with a log array of all the exercises added. */
app.get('/api/users/:_id/logs', (req, res) => {
  //using the from, to, limit parameters to request to retrieve part of the log of any user. 
  const { from, to, limit } = req.query;
  let idJson = { "id": req.params._id };
  let idToCheck = idJson.id;

  //check id
  UserInfo.findById(idToCheck, (err, data) => {
    var query = {
      username: data.username
    }

    //from and to dates are in yyy-mm-dd format
    if (from !== undefined && to === undefined) {
      query.date = { $gte: new Date(from)}
    } else if (to !== undefined && from === undefined) {
      query.date = { $lte: new Date(to) }
    } else if (from !== undefined && to !== undefined) {
      query.date = { $gte: new Date(from), $lte: new Date(to)}
    }

  //limit is an integer of how many logs to send back  
  let limitChecker = (limit) => {
    let maxLimit = 100;
    if (limit) {
      return limit;
    } else {
      return maxLimit
    }
  }

    if (err) {
      console.log("error with ID", err)        
      } else {
      
      ExerciseInfo.find((query), null, {limit: limitChecker(+limit)}, (err, docs) => {
    let loggedArray = [];
    if (err) {
      console.log("error with query", err);
    } else {
      
      let documents = docs;
      /* Each item in the log array that is returned from this Get request is an object that should have description, duration, and date properties. */
      let loggedArray = documents.map((item) => {
        return {
          "description": item.description, //a string
          "duration": item.duration, //a number
          "date": item.date.toDateString() //a string using dateString format of the Date API
        }
      })

      /*This Get request to the user's log will return a user object with a count property representing the number of exercises that belong to that user */
      const test = new LogInfo({
        "username": data.username,
        "count": loggedArray.length,
        "log": loggedArray,
      })
      
      test.save((err, data) => {
        if (err) {
          console.log("error saving exercise", err)
        } else {
          console.log("saved exercise successfully");
          /*This Get request to /api/users returns an array. Each returned element in the array is an object literal containing a user's username and _id */
          res.json({
            "_id": idToCheck,
            "username": data.username,
            "count": data.count,
            "log": loggedArray
          })
        }
      })
    }
  })
}
})  
})

//a Get request to /api/users to get a list of all users
/* Four: users in the database */
app.get('/api/users', (req, res) => {
  UserInfo.find({}, (err, data) => {
    if (err) {
      res.send("No Users");
    } else {
      res.json(data);
    }
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
