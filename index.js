// requires
const axios = require('axios');
const { MongoClient } = require('mongodb');

/* connection BDD */
const uri = 'mongodb+srv://Raphael_C:@cluster0.vpya6.mongodb.net/myFirstDatabase?retryWrites=true&w=majority'
const client = new MongoClient(uri);
const db = client.db('Cloud_velib');

async function main() {
  try {
    // Connect to the MongoDB cluster
    await client.connect();
    console.log('Connected successfully to server');
    await insert_update(db)
    let tmp= Date.now();
    // update every x sec
    while(true)
    {
      if(Date.now()-tmp>30)
      {
        await insert_update(db);   
        console.log('job done');   
        tmp=Date.now();
      }
      else
      {
        console.log("maj tmp")
      }      
    } 
    
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
}
main().catch(console.error);

// insert/update
async function insert_update(db) {
  
 const [Lille,Paris,Rennes,Lyon] =  (await axios.all([
    axios.get('https://opendata.lillemetropole.fr/api/records/1.0/search/?dataset=vlille-realtime&q=&facet=libelle&facet=nom&facet=commune&facet=etat&facet=type&facet=etatconnexion'),
    axios.get('https://opendata.paris.fr/api/records/1.0/search/?dataset=velib-disponibilite-en-temps-reel&q=&facet=name&facet=is_installed&facet=is_renting&facet=is_returning&facet=nom_arrondissement_communes'),
    axios.get('https://rennes-metropole.opendatasoft.com//api/records/1.0/search/?dataset=etat-des-stations-le-velo-star-en-temps-reel&q=&facet=nom&facet=etat&facet=nombreemplacementsactuels&facet=nombreemplacementsdisponibles&facet=nombrevelosdisponibles'),
    axios.get('https://download.data.grandlyon.com/ws/ldata/velov.stations/all.json?maxfeatures=-1&start=1'),// pas opendata
  ])).map(el=>el.data.records)
  const villesObj= {Lille,Paris,Rennes}
  for(villeName in villesObj)
  {
    console.log(villeName)
    for (const velo of villesObj[villeName])
    {
      const updatedvelo = await db.collection(`${villeName}`).findOneAndUpdate({recordid:velo.recordid},{$set: velo})
      if (!updatedvelo.value) await db.collection(`${villeName}`).insertOne(velo)
    }
  }  
};
