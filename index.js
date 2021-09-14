/* Récupe données api */
// Lille, Paris, Renne, Lyon
  const axios = require('axios');
  let lille ;
  let paris;
  let lyon ;
  let rennes ;
  axios.all([
    axios.get('https://opendata.lillemetropole.fr/api/records/1.0/search/?dataset=vlille-realtime&q=&facet=libelle&facet=nom&facet=commune&facet=etat&facet=type&facet=etatconnexion'),
    axios.get('https://opendata.paris.fr/api/records/1.0/search/?dataset=velib-disponibilite-en-temps-reel&q=&facet=name&facet=is_installed&facet=is_renting&facet=is_returning&facet=nom_arrondissement_communes'),
    axios.get('https://rennes-metropole.opendatasoft.com//api/records/1.0/search/?dataset=etat-des-stations-le-velo-star-en-temps-reel&q=&facet=nom&facet=etat&facet=nombreemplacementsactuels&facet=nombreemplacementsdisponibles&facet=nombrevelosdisponibles'),
    axios.get('https://download.data.grandlyon.com/ws/ldata/velov.stations/all.json?maxfeatures=-1&start=1'),// pas opendata
  ]).then(axios.spread((Lille, Paris, Rennes, Lyon) => {  
      lille = Lille.data.records;
      paris = Paris.data.records;
      rennes = Rennes.data.records;
      lyon = Lyon.data.records
      console.log(Lyon.data)
    })).catch(error => {
      console.log(error);
    });

    /* Push BDD */
    const {MongoClient} = require('mongodb');
    const uri ='mongodb+srv://Raphael_C:@cluster0.vpya6.mongodb.net/myFirstDatabase?retryWrites=true&w=majority' 
    const client = new MongoClient(uri);
    const db = client.db('Cloud_velib');

    async function main() {    
    try {
        // Connect to the MongoDB cluster
        await client.connect();
        console.log('Connected successfully to server');
        await  addDatabases(db);
 
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}
main().catch(console.error);

async function addDatabases(db){
  //await db.collection('Lille').insertMany(lille);
  //await db.collection('Paris').insertMany(paris);
  //await db.collection('Lyon').insertMany(lyon);
  //await db.collection('Rennes').insertMany(rennes);
};