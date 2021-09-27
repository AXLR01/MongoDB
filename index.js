// requires
const prompt = require('prompt-sync')();
const prompts = require('prompts');
const axios = require('axios');
const { MongoClient } = require('mongodb');

/* connection BDD */
const uri = 'mongodb+srv://Raphael_C:Axlr01!rap@cluster0.vpya6.mongodb.net/myFirstDatabase?retryWrites=true&w=majority'
const client = new MongoClient(uri);
const db = client.db('Cloud_velib');

async function main() {
  try {
    // Connect to the MongoDB cluster
    await client.connect();
    console.log('Connected successfully to server');

    const questions = await prompts([
   { 
     type:'select',
     name: 'choice',
     message: 'what do you want to do ?',
     choices:[
       { title: 'Insert and Upadte',value: 1},
       { title: 'Find by lat and lon',value: 2},
       { title: 'Specific things',value: 3},
     ]
   }])

   if (questions.choice==1) 
   { 
     let tmp = Date.now()
     while(true)
    {
      if(Date.now()-tmp>10)
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
   }

   if(questions.choice==2)
   {
     //Find station by lat and lon
     await find(db)  
   }

   if(questions.choice==3)
   {
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

  const villes = ['Lille', 'Paris', 'Rennes'] // collections name
  for (villeName of villes) // run all collection
  {
    let findstation = await db.collection(`${villeName}`).findOne({'geometry': {
  $near: {
  $geometry: {
  type: "Point" ,
  coordinates: [ lon, lat ]
  },
  $maxDistance: 10000,
  $minDistance: 0
  }
  }})
    console.log(findstation)    
  }
}

async function prog(db)
{
 const questions = await prompts([
   { 
     type:'select',
     name: 'choice',
     message: 'what do you want to do ?',
     choices:[
       { title: '1, find station by name',value: 1},
       { title: '2, update station',value: 2},
       { title: '3, delete station',value: 3},
       { title: '4, desactivate station by area',value: 4},
       { title: '5, print stats',value: 5}
     ]
   }])

   // looking fo station by name
   if (questions.choice==1) 
   {
     var nom = prompt('enter name ');
     let findstation = await db.collection("Lille").findOne({"fields.nom":{$regex:nom}})       
     console.log(findstation)
   }

   // update station by name
   if(questions.choice==2)
   {
     var nom = prompt('enter name ');
     let findstation = await db.collection("Lille").findOne({"fields.nom":{$regex:nom}})  
   }

   // delete station by name
   if(questions.choice==3)
   {
     var nom = prompt('enter name ');
     let findstation = await db.collection("Lille").deleteOne({"fields.nom":{$regex:nom}})  
   }

   // desactivate station by area
   if(questions.choice==4)
   {
    var lat = prompt('enter latitude where to desactivate/activate ');
    var lon = prompt('enter longitude where to desactivate/activate  ');
    lat = parseFloat(lat);
    lon = parseFloat(lon);

    await db.collection("Lille").updateMany({'geometry': {
    $near: {
    $geometry: {
    type: "Point" ,
    coordinates: [ lon, lat ]
    },
    $maxDistance: 10000,
    $minDistance: 0
    }
    }}
    ,{$set:{"fields.etat":"EN SERVICE"}})
    console.log(area);
    }   

   // print stattion state by name
   if(questions.choice==5)
   {
     
   }
 

}

// insert/update
async function insert_update(db) {
  const [Lille, Paris, Rennes, Lyon] = (await axios.all([
    axios.get('https://opendata.lillemetropole.fr/api/records/1.0/search/?dataset=vlille-realtime&q=&facet=libelle&facet=nom&facet=commune&facet=etat&facet=type&facet=etatconnexion'),
    axios.get('https://opendata.paris.fr/api/records/1.0/search/?dataset=velib-disponibilite-en-temps-reel&q=&facet=name&facet=is_installed&facet=is_renting&facet=is_returning&facet=nom_arrondissement_communes'),
    axios.get('https://rennes-metropole.opendatasoft.com//api/records/1.0/search/?dataset=etat-des-stations-le-velo-star-en-temps-reel&q=&facet=nom&facet=etat&facet=nombreemplacementsactuels&facet=nombreemplacementsdisponibles&facet=nombrevelosdisponibles'),
    axios.get('https://download.data.grandlyon.com/ws/ldata/velov.stations/all.json?maxfeatures=-1&start=1'),// pas opendata
  ])).map(el => el.data.records)
  const villesObj = { Lille, Paris, Rennes }
  for (villeName in villesObj) {
    console.log(villeName)
    for (const velo of villesObj[villeName]) {
      const updatedvelo = await db.collection(`${villeName}`).findOneAndUpdate({ recordid: velo.recordid }, { $set: velo })
      if (!updatedvelo.value) await db.collection(`${villeName}`).insertOne(velo)
    }
  }
};
