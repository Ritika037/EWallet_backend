//authentication :- Identifying the user
// authorization :- What permission do you have , what things you can access.

const express = require("express");
const { connection } = require("./db");
require("dotenv").config();
const cors = require("cors");

const { errorHandler } = require('./middleware/errorHandler')
const fileUpload = require('express-fileupload')   

const app = express()
app.use(cors())
app.options('*', cors())
// Enable CORS
app.use(
  fileUpload({
    useTempFiles: true,
  })
)
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))


app.use(errorHandler)
app.use('/api/users', require('./routes/userRoutes'))
app.use('/api', require('./routes/transactionRoutes'))
app.use('/api', require('./routes/requestRoutes'))
app.use('/api', require('./routes/uploadRoutes'))


app.get('/', (req, res) => {
  res.send('api is running...')
})


app.listen(process.env.port, async () => {
   try {
      await connection;
      console.log(`Server is running at port ${process.env.port}`);
      console.log("Connected to db");
   } catch (error) {
      console.log(error.message);
      console.log("something went wrong!!");
   }
});
