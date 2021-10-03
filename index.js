// requires
const prompt = require('prompt-sync')();
const prompts = require('prompts');
const axios = require('axios');
const { MongoClient } = require('mongodb');

/* connection BDD */
const uri = 'mongodb+srv://user:granola1234@cluster0.vpya6.mongodb.net/myFirstDatabase?retryWrites=true&w=majority'
const client = new MongoClient(uri);
const db = client.db('Cloud_velib');

async function main() {
  try {
    // Connect to the MongoDB cluster
    await client.connect();
    console.log('Connected successfully to server');

    const questions = await prompts([
      {
        type: 'select',
        name: 'choice',
        message: 'what do you want to do ?',
        choices: [
          { title: 'Insert and Upadte', value: 1 },
          { title: 'Find by lat and lon', value: 2 },
          { title: 'Specific things', value: 3 },
        ]
      }])

    if (questions.choice == 1) {
      let tmp = Date.now()
      while (true) {
        if (Date.now() - tmp > 10) {
          await insert_update(db);
          console.log('job done');
          tmp = Date.now();
        }
        else {
          console.log("maj tmp")
        }
      }
    }

    if (questions.choice == 2) {
      //Find station by lat and lon
      await find(db)
    }

    if (questions.choice == 3) {
      // specific things, work only for lille
      await prog(db)
    }

  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
}
main().catch(console.error);

// find station in Lille,Paris,Rennes depending off lat and long
async function find(db) {

  var lat = prompt('enter latitude ');
  var lon = prompt('enter longitude ');
  lat = parseFloat(lat);
  lon = parseFloat(lon);
  console.log(`lat: ${lat} lon: ${lon}`); // try lat 50,63 and lon 3,06 for check if it work

  const villes = ['Lille', 'Paris', 'Rennes', 'Lyon'] // collections name
  for (villeName of villes) // run all collection
  {
    db.collection(`${villeName}`).createIndex({ 'bicycleStationInfo.geometry': "2dsphere" })
    let findstation = await db.collection(`${villeName}`).findOne({
      'bicycleStationInfo.geometry': {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lon, lat]
          },
          $maxDistance: 10000,
          $minDistance: 0
        }
      }
    })
    console.log(findstation)
  }
}

async function prog(db) {
  const villes = ['Lille', 'Paris', 'Rennes', 'Lyon'] // collections name
  const questions = await prompts([
    {
      type: 'select',
      name: 'choice',
      message: 'what do you want to do ?',
      choices: [
        { title: '1, find station by name', value: 1 },
        { title: '2, update station', value: 2 },
        { title: '3, delete station', value: 3 },
        { title: '4, desactivate station by area', value: 4 },
        { title: '5, print stats', value: 5 }
      ]
    }])

  // looking fo station by name
  if (questions.choice == 1) {
    var nom = prompt('enter name ');
    for (villeName of villes) // run all collection
    {
      let findstation = await db.collection(`${villeName}`).find({ "bicycleStationInfo.fields.nom": { $regex: nom } })
      console.log(findstation)
    }
  }

  // update station by name 
  if (questions.choice == 2) {
  }

  // delete station by name
  if (questions.choice == 3) {
    var nom = prompt('enter name ');
    for (villeName of villes) // run all collection
    {
      await db.collection(`${villeName}`).deleteOne({ "bicycleStationInfo.fields.nom": { $regex: nom } })
    }
  }

  // desactivate station by area
  // marche pas 
  if (questions.choice == 4) {
    var lat = prompt('enter latitude where to desactivate/activate ');
    var lon = prompt('enter longitude where to desactivate/activate  ');
    lat = parseFloat(lat);
    lon = parseFloat(lon);

    await db.collection("Lille").updateMany({
      'geometry': {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lon, lat]
          },
          $maxDistance: 10000,
          $minDistance: 0
        }
      }
    }
      , { $set: { "fields.etat": "EN SERVICE" } })
    console.log(area);
  }

  // print stattion state by name
  if (questions.choice == 5) {
    // pas fait
  }


}

// insert/update
async function insert_update(db) {
  let [Lille, Paris, Rennes, Lyon] = (await axios.all([
    axios.get('https://opendata.lillemetropole.fr/api/records/1.0/search/?dataset=vlille-realtime&q=&facet=libelle&facet=nom&facet=commune&facet=etat&facet=type&facet=etatconnexion'),
    axios.get('https://opendata.paris.fr/api/records/1.0/search/?dataset=velib-disponibilite-en-temps-reel&q=&facet=name&facet=is_installed&facet=is_renting&facet=is_returning&facet=nom_arrondissement_communes'),
    axios.get('https://rennes-metropole.opendatasoft.com//api/records/1.0/search/?dataset=etat-des-stations-le-velo-star-en-temps-reel&q=&facet=nom&facet=etat&facet=nombreemplacementsactuels&facet=nombreemplacementsdisponibles&facet=nombrevelosdisponibles'),
    axios.get('https://download.data.grandlyon.com/ws/rdata/jcd_jcdecaux.jcdvelov/all.json'),
  ])).map(el => el.data.records ? el.data.records : el.data.values)
  Lille = normalizeBicycleStations(Lille, "Lille")
  Paris = normalizeBicycleStations(Paris, "Paris")
  Rennes = normalizeBicycleStations(Rennes, "Rennes")
  Lyon = normalizeBicycleStations(Lyon, "Lyon")

  const villesObj = { Lille, Paris, Rennes, Lyon }
  for (villeName in villesObj) {
    console.log(villeName)
    for (const velo of villesObj[villeName]) {
      const updatedvelo = await db.collection(`${villeName}`).findOneAndUpdate({ _id: velo._id }, { $set: velo })
      if (!updatedvelo.value) await db.collection(`${villeName}`).insertOne(velo)
    }
  }
}

// normalize data shape
function normalizeBicycleStations(bicycleStationsAPIArray, nom) {
  return bicycleStationsAPIArray.map(bicycleStation => {
    let bicycleStationInfo = nom == "Lyon" ? { fields: {} } : { ...bicycleStation }
    // on normalise comme l'api de Lille
    if (nom == "Lille") {
      bicycleStationInfo.fields = { ...bicycleStation.fields }
      delete bicycleStationInfo.fields['localisation']
      bicycleStationInfo.fields.loc = { type: "Point", coordinates: bicycleStation.fields.localisation }
    }
    else if (nom == "Paris") {
      bicycleStationInfo.fields = {}
      bicycleStationInfo.fields.etat = bicycleStation.fields.is_installed == "OUI" ? "EN SERVICE" : "INDISPONIBLE"
      // bicycleStationInfo.fields.etatconnexion= bicycleStation.fields.is_renting=="OUI" ? "CONNECTED" : "UNCONNECTED" 
      bicycleStationInfo.fields.etatconnexion = undefined
      bicycleStationInfo.fields.nbvelosdispo = bicycleStation.fields.numbikesavailable
      bicycleStationInfo.fields.nbplacesdispo = bicycleStation.fields.numdocksavailable
      bicycleStationInfo.fields.type = undefined
      bicycleStationInfo.fields.commune = bicycleStation.fields.nom_arrondissement_communes
      bicycleStationInfo.fields.libelle = bicycleStation.fields.stationcode
      bicycleStationInfo.fields.datemiseajour = bicycleStation.fields.duedate
      // bicycleStationInfo.fields.localisation= bicycleStation.fields.coordonnees_geo
      bicycleStationInfo.fields.loc = { type: "Point", coordinates: bicycleStation.fields.coordonnees_geo }
      bicycleStationInfo.fields.nom = bicycleStation.fields.name
      bicycleStationInfo.fields.adresse = undefined
    }
    else if (nom == "Rennes") {
      bicycleStationInfo.fields = {}
      bicycleStationInfo.fields.etat = bicycleStation.fields.etat == "En fonctionnement" ? "EN SERVICE" : "INDISPONIBLE"
      bicycleStationInfo.fields.etatconnexion = undefined
      bicycleStationInfo.fields.nbvelosdispo = bicycleStation.fields.nombrevelosdisponibles
      bicycleStationInfo.fields.nbplacesdispo = bicycleStation.fields.nombreemplacementsdisponibles
      bicycleStationInfo.fields.type = undefined
      bicycleStationInfo.fields.commune = undefined
      bicycleStationInfo.fields.libelle = bicycleStation.fields.idstation
      bicycleStationInfo.fields.datemiseajour = bicycleStation.fields.duedate
      // bicycleStationInfo.fields.localisation= bicycleStation.fields.coordonnees
      bicycleStationInfo.fields.loc = { type: "Point", coordinates: bicycleStation.fields.coordonnees }
      bicycleStationInfo.fields.nom = bicycleStation.fields.nom
      bicycleStationInfo.fields.adresse = undefined
    }
    else if (nom == "Lyon") {
      bicycleStationInfo.fields.etat = bicycleStation.availabilitycode == 1 ? "EN SERVICE" : "INDISPONIBLE"
      bicycleStationInfo.fields.etatconnexion = undefined
      bicycleStationInfo.fields.nbvelosdispo = bicycleStation.available_bikes
      bicycleStationInfo.fields.nbplacesdispo = bicycleStation.available_bike_stands
      bicycleStationInfo.fields.type = undefined
      bicycleStationInfo.fields.commune = bicycleStation.commune
      bicycleStationInfo.fields.libelle = bicycleStation.code_insee
      bicycleStationInfo.fields.datemiseajour = bicycleStation.last_update
      // bicycleStationInfo.fields.localisation= bicycleStation.fields.coordonnees
      bicycleStationInfo.fields.loc = { type: "Point", coordinates: [bicycleStation.lat, bicycleStation.lon] }
      bicycleStationInfo.fields.nom = bicycleStation.name
      bicycleStationInfo.fields.adresse = bicycleStation.address
    }
    return {
      bicycleStationInfo,
      // _id: bicycleStationInfo.recordid,
      _id: bicycleStationInfo.fields.libelle,
    }
  })
}