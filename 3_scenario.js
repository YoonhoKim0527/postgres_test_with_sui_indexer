import fs from 'fs/promises';

import postgres from 'postgres'

const sql = postgres('postgres://postgres:ia7XBQjKfL8UnaH6@sui-rds.luniverse.com/postgres', {
    host    : 'sui-rds.luniverse.com',
    port    : 5432,
    database: 'postgres',
    username: 'postgres',
    password: 'ia7XBQjKfL8UnaH6',
    max : 1,
})

function getRandomAddresses(jsonData, numberOfAddresses) {
  // Shuffle the array to ensure random selection
  const shuffledAddresses = jsonData.sort(() => 0.5 - Math.random());

  // Return the first numberOfAddresses elements
  return shuffledAddresses.slice(0, numberOfAddresses);
}

function calculateSumOfTimes(resultArray) {
    let totalTime =0;
  
    for (const result of resultArray) {
        var sum_time_result =0;

        for(const query of result){
            const entry = query['QUERY PLAN'];
            if(entry.includes('Time')){
                const regex = /Execution Time: (\d+\.\d+) ms/;
                const regex2 = /Planning Time: (\d+\.\d+) ms/;
                const match1 = entry.match(regex);
                const match2 = entry.match(regex2);

                if (match1) {
                // Convert the matched time value to a floating-point number
                    const executionTime = parseFloat(match1[1]);
                    sum_time_result += executionTime;
                    //console.log(executionTime);
                } else if (match2) {
                    const planningTime = parseFloat(match2[1]);
                    sum_time_result += planningTime;
                    //console.log(planningTime);
                }

            }
        } 
        //console.log("aa" + sum_time_result);
        totalTime += sum_time_result;
    }
    //console.log(totalTime);
    return totalTime;
  }

async function readAddressesFile() {
    try {
      const data = await fs.readFile('addresses.json', 'utf8');
      const jsonData = JSON.parse(data);
      const numberOfAddressesToChoose = 5;
      const randomAddresses = getRandomAddresses(jsonData, numberOfAddressesToChoose);
  
      // Extract address values and store in an array
      const addressArray = randomAddresses.map(item => item.account_address);
  
      const addressModifyArray = addressArray.map(address => {
        // Use parameterized query
        return sql`EXPLAIN ANALYZE select changed_objects.object_id, changed_objects.transaction_digest, changed_objects.object_version, objects.object_digest, objects.epoch, objects.checkpoint
        from changed_objects
        inner join objects
        on changed_objects.object_id = objects.object_id
        where changed_objects.object_id = ${address}
        order by object_version
        LIMIT 20;`
      });
  
      const users = await Promise.all(addressModifyArray.map(sqlQuery => sqlQuery));
      console.log(users);
      const totalTime  = calculateSumOfTimes(users);
      console.log(totalTime/numberOfAddressesToChoose);
    
      //console.log(addressArray);
    } catch (error) {
      console.error('Error reading or parsing JSON data:', error);
    }
  }
  
  readAddressesFile();
  