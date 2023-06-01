const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const app = express();
app.use(express.json());
let db = null;
const dbPath = path.join(__dirname, "covid19India.db");
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();
const convertDetails = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};
const convertDistrictDetails = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

//GET all states APIs
app.get("/states/", async (request, response) => {
  const getAllStates = `
        SELECT * FROM state ORDER BY state_id;
    `;
  const allStates = await db.all(getAllStates);
  response.send(allStates.map((eachState) => convertDetails(eachState)));
});

//GET a state API
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const stateQuery = `
        SELECT * FROM state WHERE state_id = ${stateId};
    `;
  const queryResult = await db.get(stateQuery);
  response.send(convertDetails(queryResult));
});

//POST a state API
app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const addQuery = `
        INSERT INTO district(district_name, state_id, cases, cured, active, deaths)
        VALUES ('${districtName}', ${stateId}, ${cases}, ${cured}, ${active}, ${deaths});
    `;
  const updateQuery = await db.run(addQuery);
  response.send("District Successfully Added");
});

//GET a district API
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const addQuery = `
        SELECT * FROM district WHERE district_id = ${districtId};
    `;
  const resultQuery = await db.get(addQuery);
  response.send(convertDistrictDetails(resultQuery));
});

//Delete a district API
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteQuery = `
        DELETE FROM district WHERE district_id = ${districtId};
    `;
  const resultQuery = await db.run(deleteQuery);
  response.send("District Removed");
});

//Put a district API
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const requestDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = requestDetails;
  const updateQuery = `
    UPDATE district SET district_name = '${districtName}', state_id = ${stateId},
    cases = ${cases}, cured = ${cured}, active = ${active}, deaths = ${deaths}
    WHERE district_id = ${districtId};
  `;
  const resultQuery = await db.run(updateQuery);
  response.send("District Details Updated");
});

//Get statics of state API
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStateStatsQuery = `
        SELECT SUM(cases), 
        SUM(cured),
        SUM(active), 
        SUM(deaths)
        FROM 
          district 
        WHERE 
          state_id = ${stateId};
    `;
  const stats = await db.get(getStateStatsQuery);
  response.send({
    totalCases: stats["SUM(cases)"],
    totalCured: stats["SUM(cured)"],
    totalActive: stats["SUM(active)"],
    totalDeaths: stats["SUM(deaths)"],
  });
});

//Get a state name API
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const addQuery = `
        SELECT D.state_name AS stateName FROM (state INNER JOIN district ON state.state_id=district.state_id) AS D WHERE D.district_id = ${districtId};
    `;
  const resultQuery = await db.get(addQuery);
  response.send(resultQuery);
});

module.exports = app;
