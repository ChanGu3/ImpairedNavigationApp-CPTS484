import React, {useState, useEffect} from 'react';
import {View, Text, TouchableOpacity} from 'react-native';

const App = () => {
  const [message, setMessage] = useState('Loading...');
  const [data, setData] = useState([]);

  const fetchData = async () => {
    try {
      const response = await fetch('http://10.0.2.2:5000/');
      const result = await response.json();
      setMessage(result.message);
    } catch (error) {
      setMessage('Error connecting to server');
    }
  };

  const fetchList = async () => {
    try {
      const response = await fetch('http://10.0.2.2:5000/api/data');
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      setData(['Error loading data']);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <View style={{flex: 1, padding: 20, justifyContent: 'center'}}>
      <Text style={{fontSize: 20, marginBottom: 20}}>{message}</Text>
      
      <TouchableOpacity 
        onPress={fetchList}
        style={{backgroundColor: 'blue', padding: 10, marginBottom: 20}}>
        <Text style={{color: 'white', textAlign: 'center'}}>Get Data</Text>
      </TouchableOpacity>

      {data.map((item, index) => (
        <Text key={index} style={{marginBottom: 5}}>{item}</Text>
      ))}
    </View>
  );
};

export default App;