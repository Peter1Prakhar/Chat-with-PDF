import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors())

app.get('/', (req, res) => {
    return res.json({status : "all good..."})
})
app.listen(8000, () => console.log(`Server running at port ${8000}`))