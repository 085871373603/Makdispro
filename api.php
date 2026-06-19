<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// ==========================================
// KONFIGURASI API
// ==========================================
$PROJECT_ID = "appoprasional"; 
$GEMINI_API_KEY = "AIzaSyCHpIg4oofcucPJdtPcJFuTJBNDaKrHmi0"; 

$action = $_GET['action'] ?? '';

// --- FUNGSI BANTUAN API REQUEST ---
function sendRequest($url, $method = 'GET', $data = null) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    if ($data !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Content-Length: ' . strlen($data)
        ]);
    }
    $response = curl_exec($ch);
    curl_close($ch);
    return $response;
}

// --- FUNGSI KONVERSI JSON KE FORMAT FIRESTORE ---
function toFirestoreFormat($data) {
    if (is_array($data)) {
        if (array_keys($data) !== range(0, count($data) - 1)) {
            $fields = [];
            foreach ($data as $k => $v) { $fields[$k] = toFirestoreFormat($v); }
            return ['mapValue' => ['fields' => $fields]];
        } else {
            $values = [];
            foreach ($data as $v) { $values[] = toFirestoreFormat($v); }
            return ['arrayValue' => ['values' => $values]];
        }
    } elseif (is_int($data)) { return ['integerValue' => $data]; } 
      elseif (is_float($data)) { return ['doubleValue' => $data]; } 
      elseif (is_bool($data)) { return ['booleanValue' => $data]; } 
      elseif (is_null($data)) { return ['nullValue' => null]; } 
      else { return ['stringValue' => (string)$data]; }
}

function buildFirestorePayload($data) {
    $fields = [];
    foreach ($data as $k => $v) { $fields[$k] = toFirestoreFormat($v); }
    return json_encode(['fields' => $fields]);
}

// --- FUNGSI KONVERSI FIRESTORE KE JSON BIASA ---
function parseFirestore($data) {
    if (!is_array($data)) return $data;
    if (isset($data['stringValue'])) return $data['stringValue'];
    if (isset($data['integerValue'])) return (int)$data['integerValue'];
    if (isset($data['doubleValue'])) return (float)$data['doubleValue'];
    if (isset($data['booleanValue'])) return $data['booleanValue'];
    if (isset($data['nullValue'])) return null;
    if (isset($data['mapValue']['fields'])) {
        $res = []; foreach ($data['mapValue']['fields'] as $k => $v) { $res[$k] = parseFirestore($v); } return $res;
    }
    if (isset($data['arrayValue']['values'])) {
        $res = []; foreach ($data['arrayValue']['values'] as $v) { $res[] = parseFirestore($v); } return $res;
    }
    if (isset($data['fields'])) {
        $res = []; foreach ($data['fields'] as $k => $v) { $res[$k] = parseFirestore($v); } return $res;
    }
    return $data;
}

// ==========================================
// ROUTING AKSI
// ==========================================
if ($action === 'simpanData') {
    $inputData = json_decode(file_get_contents("php://input"), true);
    $docId = $_GET['doc'] ?? '';
    
    $url = "https://firestore.googleapis.com/v1/projects/{$PROJECT_ID}/databases/(default)/documents/pps_targets/{$docId}";
    
    // Gunakan PATCH untuk menyimpan/menimpa data di Firestore
    $payload = buildFirestorePayload($inputData);
    $result = sendRequest($url, 'PATCH', $payload);
    
    echo json_encode(["status" => "success", "response" => json_decode($result)]);
} 

elseif ($action === 'ambilData') {
    $docId = $_GET['doc'] ?? '';
    $url = "https://firestore.googleapis.com/v1/projects/{$PROJECT_ID}/databases/(default)/documents/pps_targets/{$docId}";
    
    $result = sendRequest($url, 'GET');
    $json = json_decode($result, true);
    
    if (isset($json['error'])) {
        echo json_encode(["error" => "Data tidak ditemukan"]);
    } else {
        echo json_encode(parseFirestore($json));
    }
}

elseif ($action === 'tanyaAI') {
    $input = json_decode(file_get_contents("php://input"), true);
    $prompt = $input['prompt'] ?? '';
    $geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" . $GEMINI_API_KEY;
    
    $geminiPayload = json_encode([ "contents" => [ ["parts" => [["text" => $prompt]]] ] ]);
    $result = sendRequest($geminiUrl, 'POST', $geminiPayload);
    echo $result;
} 

else {
    echo json_encode(["error" => "Aksi tidak dikenal"]);
}
?>
